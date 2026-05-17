from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from app.models.business import SectorType
from app.schemas.user import UserRead
from app.schemas.business import BusinessRead

class SignupRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    business_name: str = Field(min_length=2, max_length=120)
    sector: SectorType
    phone: str | None = None
    city: str | None = None
    state: str | None = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        if not any(char.islower() for char in value):
            raise ValueError("Password must include a lowercase letter")
        if not any(char.isupper() for char in value):
            raise ValueError("Password must include an uppercase letter")
        if not any(char.isdigit() for char in value):
            raise ValueError("Password must include a number")
        return value

class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)

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

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    business_name: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    sector: Optional[SectorType] = None


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, value: str) -> str:
        return SignupRequest.validate_password(value)
