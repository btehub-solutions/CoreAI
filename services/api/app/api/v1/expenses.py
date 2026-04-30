from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from app.database import get_db
from app.models.expense import Expense
from app.models.business import Business
from app.models.user import User
from app.schemas.expense import ExpenseCreate, ExpenseUpdate, ExpenseRead
from app.schemas.common import ApiResponse, PaginatedResponse, Meta
from app.dependencies import get_current_business, get_owner
from app.core.audit import log_action

router = APIRouter(prefix="/expenses", tags=["expenses"])

DEFAULT_CATEGORIES = [
    "Restock", "Staff salary", "Rent", "Generator fuel", "Utilities",
    "Packaging", "Transport", "Equipment", "Maintenance", "Other"
]

def to_ngn(kobo: int) -> float:
    return kobo / 100

def to_kobo(ngn: float) -> int:
    return int(round(ngn * 100))

def map_expense_response(e: Expense) -> ExpenseRead:
    return ExpenseRead(
        id=e.id,
        category=e.category,
        description=e.description,
        amount_kobo=e.amount_kobo,
        amount_ngn=to_ngn(e.amount_kobo),
        expense_date=e.expense_date,
        created_at=e.created_at
    )

@router.get("/categories", response_model=ApiResponse[List[str]])
async def get_categories():
    return ApiResponse(data=DEFAULT_CATEGORIES)

@router.post("", response_model=ApiResponse[ExpenseRead])
async def create_expense(
    request: Request,
    body: ExpenseCreate,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    new_expense = Expense(
        business_id=business.id,
        category=body.category,
        description=body.description,
        amount_kobo=to_kobo(body.amount_ngn),
        expense_date=body.expense_date or datetime.utcnow()
    )
    db.add(new_expense)
    await db.commit()
    await db.refresh(new_expense)
    
    # Invalidate cache
    from app.core.cache import invalidate_dashboard_cache
    await invalidate_dashboard_cache(str(business.id))
    
    await log_action(
        db=db,
        user=current_user,
        action="expense.created",
        resource="expense",
        resource_id=new_expense.id,
        detail=f"Recorded expense: {new_expense.category} - {new_expense.amount_kobo / 100} NGN",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data=map_expense_response(new_expense))

@router.get("", response_model=PaginatedResponse[ExpenseRead])
async def list_expenses(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    category: Optional[str] = Query(None),
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    query = select(Expense).where(
        Expense.business_id == business.id,
        Expense.deleted_at == None
    )
    
    if start_date:
        query = query.where(Expense.expense_date >= start_date)
    if end_date:
        query = query.where(Expense.expense_date <= end_date)
    if category:
        query = query.where(Expense.category == category)
        
    query = query.order_by(Expense.expense_date.desc())
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Pagination
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    expenses = result.scalars().all()
    
    return PaginatedResponse(
        data=[map_expense_response(e) for e in expenses],
        meta=Meta(page=page, per_page=per_page, total=total)
    )

@router.patch("/{expense_id}", response_model=ApiResponse[ExpenseRead])
async def update_expense(
    request: Request,
    expense_id: UUID,
    body: ExpenseUpdate,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.business_id == business.id,
            Expense.deleted_at == None
        )
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    update_data = body.dict(exclude_unset=True)
    if "amount_ngn" in update_data:
        update_data["amount_kobo"] = to_kobo(update_data.pop("amount_ngn"))
        
    for key, value in update_data.items():
        setattr(expense, key, value)
        
    await db.commit()
    await db.refresh(expense)
    
    await log_action(
        db=db,
        user=current_user,
        action="expense.updated",
        resource="expense",
        resource_id=expense.id,
        detail=f"Updated expense: {expense.category}",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data=map_expense_response(expense))

@router.delete("/{expense_id}", response_model=ApiResponse[dict])
async def delete_expense(
    request: Request,
    expense_id: UUID,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Expense).where(
            Expense.id == expense_id,
            Expense.business_id == business.id,
            Expense.deleted_at == None
        )
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    
    expense.deleted_at = datetime.utcnow()
    await db.commit()
    
    await log_action(
        db=db,
        user=current_user,
        action="expense.deleted",
        resource="expense",
        resource_id=expense_id,
        detail=f"Deleted expense record",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data={"id": expense_id}, message="Expense soft deleted")
