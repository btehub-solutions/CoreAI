from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from datetime import datetime
from typing import Optional, List
from uuid import UUID

from app.database import get_db
from app.models.sale import Sale, SaleStatus
from app.models.refund import Refund
from app.models.product import Product
from app.models.business import Business
from app.models.user import User
from app.schemas.refund import RefundCreate, RefundRead, SaleSummary
from app.schemas.common import ApiResponse, PaginatedResponse, Meta
from app.dependencies import get_current_business, get_owner
from app.core.audit import log_action

router = APIRouter(prefix="/refunds", tags=["refunds"])

def to_ngn(kobo: int) -> float:
    return kobo / 100

def to_kobo(ngn: float) -> int:
    return int(round(ngn * 100))

def map_refund_response(r: Refund) -> RefundRead:
    # Calculate grand total for sale summary if available
    grand_total_kobo = sum(item.total_kobo for item in r.sale.items) if r.sale and r.sale.items else 0
    
    return RefundRead(
        id=r.id,
        sale_id=r.sale_id,
        reason=r.reason,
        amount_kobo=r.amount_kobo,
        amount_ngn=to_ngn(r.amount_kobo),
        restock=r.restock,
        refund_date=r.refund_date,
        sale_summary=SaleSummary(
            grand_total_kobo=grand_total_kobo,
            payment_method=r.sale.payment_method,
            sale_date=r.sale.sale_date
        ) if r.sale else None,
        created_at=r.created_at
    )

@router.post("", response_model=ApiResponse[RefundRead])
async def create_refund(
    request: Request,
    body: RefundCreate,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    # 1. Load sale
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Sale).options(selectinload(Sale.items)).where(
            Sale.id == body.sale_id,
            Sale.business_id == business.id
        )
    )
    sale = result.scalar_one_or_none()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
        
    # 2. Verify status
    if sale.status == SaleStatus.REFUNDED:
        raise HTTPException(status_code=400, detail="Sale is already fully refunded")
        
    # 3. Verify amount
    sale_grand_total = sum(item.total_kobo for item in sale.items)
    refund_amount_kobo = to_kobo(body.amount_ngn)
    if refund_amount_kobo > sale_grand_total:
        raise HTTPException(status_code=400, detail="Refund amount exceeds sale total")
        
    # 4. Restock
    if body.restock == "yes":
        if not body.items:
            raise HTTPException(status_code=400, detail="Items required for restocking")
            
        product_ids = [item.product_id for item in body.items]
        prod_result = await db.execute(
            select(Product).where(Product.id.in_(product_ids))
        )
        products = {p.id: p for p in prod_result.scalars().all()}
        
        for item in body.items:
            if item.product_id in products:
                products[item.product_id].stock_quantity += item.quantity

    # 5. Create Refund
    new_refund = Refund(
        business_id=business.id,
        sale_id=sale.id,
        reason=body.reason,
        amount_kobo=refund_amount_kobo,
        restock=body.restock,
        refund_date=datetime.utcnow()
    )
    db.add(new_refund)
    
    # 6. Update sale status
    if refund_amount_kobo >= sale_grand_total:
        sale.status = SaleStatus.REFUNDED
    else:
        sale.status = SaleStatus.PARTIAL_REFUND
        
    # 7. Commit
    try:
        await db.commit()
        await db.refresh(new_refund)
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to process refund: {str(e)}")

    # Fetch with relationship for response
    stmt = select(Refund).options(
        selectinload(Refund.sale).selectinload(Sale.items)
    ).where(Refund.id == new_refund.id)
    final_result = await db.execute(stmt)
    refund = final_result.scalar_one()
    
    # Invalidate cache
    from app.core.cache import invalidate_dashboard_cache
    await invalidate_dashboard_cache(str(business.id))
    
    await log_action(
        db=db,
        user=current_user,
        action="refund.created",
        resource="refund",
        resource_id=refund.id,
        detail=f"Processed refund for sale: {refund.sale_id}, Amount: {refund.amount_kobo / 100} NGN",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data=map_refund_response(refund))

@router.get("", response_model=PaginatedResponse[RefundRead])
async def list_refunds(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.orm import selectinload
    query = select(Refund).options(
        selectinload(Refund.sale).selectinload(Sale.items)
    ).where(
        Refund.business_id == business.id,
        Refund.deleted_at == None
    )
    
    if start_date:
        query = query.where(Refund.refund_date >= start_date)
    if end_date:
        query = query.where(Refund.refund_date <= end_date)
        
    query = query.order_by(Refund.refund_date.desc())
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Pagination
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    refunds = result.scalars().all()
    
    return PaginatedResponse(
        data=[map_refund_response(r) for r in refunds],
        meta=Meta(page=page, per_page=per_page, total=total)
    )

@router.get("/{refund_id}", response_model=ApiResponse[RefundRead])
async def get_refund(
    refund_id: UUID,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Refund).options(
            selectinload(Refund.sale).selectinload(Sale.items)
        ).where(
            Refund.id == refund_id,
            Refund.business_id == business.id,
            Refund.deleted_at == None
        )
    )
    refund = result.scalar_one_or_none()
    if not refund:
        raise HTTPException(status_code=404, detail="Refund not found")
    
    return ApiResponse(data=map_refund_response(refund))
