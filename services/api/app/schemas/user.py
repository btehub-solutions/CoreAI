from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    full_name: str
    email: EmailStr

class UserCreate(UserBase):
    password: str
    role: UserRole = UserRole.CASHIER

class UserRead(UserBase):
    id: UUID
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
