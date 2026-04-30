from pydantic import BaseModel, EmailStr
from typing import Optional
from app.models.business import SectorType
from app.schemas.user import UserRead
from app.schemas.business import BusinessRead

class SignupRequest(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    business_name: str
    sector: SectorType
    phone: str | None = None
    city: str | None = None
    state: str | None = None

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead
    business: Optional[BusinessRead] = None

class MeResponse(BaseModel):
    user: UserRead
    business: BusinessRead
