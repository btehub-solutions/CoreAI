from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, List
from app.models.sale import PaymentMethod

class RefundItemCreate(BaseModel):
    product_id: UUID
    quantity: int

class RefundCreate(BaseModel):
    sale_id: UUID
    reason: Optional[str] = None
    amount_ngn: float
    restock: str = "no" # "yes" | "no"
    items: Optional[List[RefundItemCreate]] = None

class SaleSummary(BaseModel):
    grand_total_kobo: int
    payment_method: PaymentMethod
    sale_date: datetime

class RefundRead(BaseModel):
    id: UUID
    sale_id: UUID
    reason: Optional[str] = None
    amount_kobo: int
    amount_ngn: float
    restock: str
    refund_date: datetime
    sale_summary: Optional[SaleSummary] = None
    created_at: datetime

    model_config = {"from_attributes": True}
