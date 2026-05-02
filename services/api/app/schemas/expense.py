from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional

class ExpenseBase(BaseModel):
    category: str
    description: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    amount_ngn: float
    expense_date: Optional[datetime] = None

class ExpenseUpdate(BaseModel):
    category: Optional[str] = None
    description: Optional[str] = None
    amount_ngn: Optional[float] = None
    expense_date: Optional[datetime] = None

class ExpenseRead(ExpenseBase):
    id: UUID
    amount_kobo: int
    amount_ngn: float
    expense_date: datetime
    created_at: datetime

    model_config = {"from_attributes": True}
