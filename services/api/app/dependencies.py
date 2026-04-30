from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, UserRole
from app.models.business import Business
from app.core.security import decode_token

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> User:
    try:
        payload = decode_token(credentials.credentials)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type")

    result = await db.execute(select(User).where(User.id == payload["sub"]))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User account is disabled")
    return user

async def get_owner(
    current_user: User = Depends(get_current_user),
) -> User:
    if current_user.role != UserRole.OWNER:
        raise HTTPException(
            status_code=403,
            detail="Owner access required"
        )
    return current_user

async def get_any_staff(
    current_user: User = Depends(get_current_user),
) -> User:
    return current_user

async def get_current_business(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Business:
    result = await db.execute(
        select(Business).where(Business.id == current_user.business_id)
    )
    business = result.scalar_one_or_none()
    if not business:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Business not found")
    return business
