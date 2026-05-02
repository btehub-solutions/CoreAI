from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.models.business import Business
from app.core.security import (
    hash_password, verify_password, 
    create_access_token, create_refresh_token,
    decode_token
)
from app.schemas.auth import (
    SignupRequest, LoginRequest, RefreshRequest, 
    TokenResponse, MeResponse, ProfileUpdateRequest
)
from app.schemas.common import ApiResponse
from app.dependencies import get_current_user, get_current_business, get_owner
from app.core.audit import log_action
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/signup", response_model=ApiResponse[TokenResponse])
async def signup(
    request: Request,
    body: SignupRequest,
    db: AsyncSession = Depends(get_db)
):
    # Check if user already exists
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user and business in one transaction
    new_user = User(
        full_name=body.full_name,
        email=body.email,
        hashed_password=hash_password(body.password),
        phone=body.phone,
        role=UserRole.OWNER
    )
    db.add(new_user)
    await db.flush() # Get user ID
    
    new_business = Business(
        name=body.business_name,
        sector=body.sector,
        owner_id=new_user.id,
        phone=body.phone,
        city=body.city,
        state=body.state
    )
    db.add(new_business)
    await db.flush() # Get business ID
    
    # Link user to business
    new_user.business_id = new_business.id
    
    await db.commit()
    await db.refresh(new_user)
    await db.refresh(new_business)
    
    access_token = create_access_token(new_user.id, new_business.id, new_user.role)
    refresh_token = create_refresh_token(new_user.id)
    
    await log_action(
        db=db,
        user=new_user,
        action="auth.login",
        resource="auth",
        resource_id=new_user.id,
        detail=f"User signed up and logged in: {new_user.email}",
        ip_address=request.client.host if request.client else None,
    )
    
    return ApiResponse(data=TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=new_user,
        business=new_business
    ))

@router.post("/login", response_model=ApiResponse[TokenResponse])
async def login(
    request: Request,
    body: LoginRequest,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(User).where(User.email == body.email)
    )
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )
    
    # Get business ID
    biz_result = await db.execute(
        select(Business).where(Business.id == user.business_id)
    )
    business = biz_result.scalar_one_or_none()
    
    access_token = create_access_token(user.id, business.id if business else None, user.role)
    refresh_token = create_refresh_token(user.id)
    
    await log_action(
        db=db,
        user=user,
        action="auth.login",
        resource="auth",
        resource_id=user.id,
        detail=f"User logged in: {user.email}",
        ip_address=request.client.host if request.client else None,
    )

    return ApiResponse(data=TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=user,
        business=business
    ))

@router.post("/refresh", response_model=ApiResponse[TokenResponse])
async def refresh(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_token(body.refresh_token)
        if payload.get("type") != "refresh":
            raise ValueError("Invalid token type")
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User found or inactive"
        )
        
    # Get business ID
    biz_result = await db.execute(
        select(Business).where(Business.id == user.business_id)
    )
    business = biz_result.scalar_one_or_none()
    
    access_token = create_access_token(user.id, business.id if business else None, user.role)
    refresh_token = create_refresh_token(user.id)
    
    return ApiResponse(data=TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        expires_in=settings.access_token_expire_minutes * 60,
        user=user,
        business=business
    ))

@router.get("/me", response_model=ApiResponse[MeResponse])
async def me(
    current_user: User = Depends(get_current_user),
    current_business: Business = Depends(get_current_business)
):
    return ApiResponse(data=MeResponse(
        user=current_user,
        business=current_business
    ))

@router.patch("/profile", response_model=ApiResponse[MeResponse])
async def update_profile(
    body: ProfileUpdateRequest,
    current_user: User = Depends(get_current_user),
    current_business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    if body.full_name is not None:
        current_user.full_name = body.full_name
    if body.phone is not None:
        current_user.phone = body.phone
        current_business.phone = body.phone
    if body.business_name is not None:
        current_business.name = body.business_name
    if body.city is not None:
        current_business.city = body.city
    if body.state is not None:
        current_business.state = body.state
    if body.sector is not None:
        current_business.sector = body.sector

    await db.commit()
    await db.refresh(current_user)
    await db.refresh(current_business)

    return ApiResponse(data=MeResponse(
        user=current_user,
        business=current_business
    ))

@router.delete("/me", response_model=ApiResponse[dict])
async def delete_account(
    current_user: User = Depends(get_owner),
    db: AsyncSession = Depends(get_db)
):
    # Due to foreign keys, cascade deletes should handle the related records
    # but we will just mark the user and business as deleted if we were soft deleting.
    # We are physically deleting them per user request.
    # Business first
    biz_result = await db.execute(select(Business).where(Business.id == current_user.business_id))
    business = biz_result.scalar_one_or_none()
    
    await db.delete(current_user)
    if business:
        await db.delete(business)
        
    await db.commit()
    return ApiResponse(data={"deleted": True}, message="Account successfully deleted")
