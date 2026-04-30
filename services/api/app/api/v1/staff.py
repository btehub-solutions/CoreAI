from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from uuid import UUID

from app.database import get_db
from app.models.user import User, UserRole
from app.models.staff import Staff
from app.models.business import Business
from app.schemas.staff import StaffCreate, StaffRead, StaffAccountCreate, StaffUpdate
from app.schemas.user import UserRead
from app.schemas.common import ApiResponse
from app.dependencies import get_current_business, get_owner
from app.core.security import hash_password
from app.core.audit import log_action

router = APIRouter(prefix="/staff", tags=["staff"])

@router.get("", response_model=ApiResponse[List[StaffRead]])
async def list_staff(
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Staff).where(
            Staff.business_id == business.id,
            Staff.deleted_at == None
        )
    )
    staff = result.scalars().all()
    return ApiResponse(data=staff)

@router.post("", response_model=ApiResponse[StaffRead])
async def create_staff_record(
    request: Request,
    body: StaffCreate,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    new_staff = Staff(
        business_id=business.id,
        full_name=body.full_name,
        phone=body.phone,
        role=body.role,
        salary_kobo=body.salary_kobo
    )
    db.add(new_staff)
    await db.commit()
    await db.refresh(new_staff)
    
    await log_action(
        db=db,
        user=current_user,
        action="staff.created",
        resource="staff",
        resource_id=new_staff.id,
        detail=f"Created staff record: {new_staff.full_name}",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data=new_staff)

@router.post("/create-account", response_model=ApiResponse[dict])
async def create_staff_account(
    request: Request,
    body: StaffAccountCreate,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    # 1. Verify staff exists and belongs to business
    staff_result = await db.execute(
        select(Staff).where(
            Staff.id == body.staff_id,
            Staff.business_id == business.id
        )
    )
    staff = staff_result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff record not found")
        
    if staff.user_id:
        raise HTTPException(status_code=400, detail="Staff already has an account")

    # 2. Check email
    user_result = await db.execute(select(User).where(User.email == body.email))
    if user_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 3. Create User
    new_user = User(
        full_name=staff.full_name,
        email=body.email,
        hashed_password=hash_password(body.password),
        role=UserRole.CASHIER if body.role == "cashier" else UserRole.OWNER,
        business_id=business.id,
        is_active=True
    )
    db.add(new_user)
    await db.flush() # Get user ID
    
    # 4. Link to staff record
    staff.user_id = new_user.id
    
    await db.commit()
    await db.refresh(new_user)
    
    await log_action(
        db=db,
        user=current_user,
        action="auth.staff_created",
        resource="user",
        resource_id=new_user.id,
        detail=f"Created login account for staff: {staff.full_name} ({new_user.role})",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data={
        "user_id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "full_name": new_user.full_name
    })

@router.patch("/{staff_id}/deactivate", response_model=ApiResponse[StaffRead])
async def deactivate_staff(
    request: Request,
    staff_id: UUID,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Staff).where(
            Staff.id == staff_id,
            Staff.business_id == business.id
        )
    )
    staff = result.scalar_one_or_none()
    if not staff:
        raise HTTPException(status_code=404, detail="Staff not found")
    
    staff.is_active = False
    
    # Also deactivate linked user
    if staff.user_id:
        user_result = await db.execute(select(User).where(User.id == staff.user_id))
        user = user_result.scalar_one_or_none()
        if user:
            user.is_active = False
    
    await db.commit()
    await db.refresh(staff)
    
    await log_action(
        db=db,
        user=current_user,
        action="staff.deactivated",
        resource="staff",
        resource_id=staff.id,
        detail=f"Deactivated staff member and login access: {staff.full_name}",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data=staff)
