from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.staff import StaffRole

class StaffBase(BaseModel):
    full_name: str
    phone: Optional[str] = None
    role: StaffRole = StaffRole.WORKER
    salary_kobo: int = 0

class StaffCreate(StaffBase):
    pass

class StaffUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[StaffRole] = None
    salary_kobo: Optional[int] = None
    is_active: Optional[bool] = None

class StaffAccountCreate(BaseModel):
    staff_id: UUID
    email: EmailStr
    password: str
    role: str = "cashier"

class StaffRead(StaffBase):
    id: UUID
    business_id: UUID
    is_active: bool
    user_id: Optional[UUID] = None
    created_at: datetime
    
    model_config = {"from_attributes": True}
