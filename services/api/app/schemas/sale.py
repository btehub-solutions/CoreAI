from pydantic import BaseModel, computed_field
from uuid import UUID
from datetime import datetime
from typing import List, Optional
from app.models.sale import PaymentMethod, SaleStatus

class SaleItemBase(BaseModel):
    product_id: UUID
    quantity: int

class SaleItemCreate(SaleItemBase):
    pass

class SaleItemRead(SaleItemBase):
    id: UUID
    product_name: str
    unit_price_kobo: int
    total_kobo: int

    @computed_field  # type: ignore[misc]
    @property
    def unit_price_ngn(self) -> float:
        return self.unit_price_kobo / 100

    @computed_field  # type: ignore[misc]
    @property
    def total_ngn(self) -> float:
        return self.total_kobo / 100

class SaleCreate(BaseModel):
    payment_method: PaymentMethod
    notes: Optional[str] = None
    items: List[SaleItemCreate]

class SaleRead(BaseModel):
    id: UUID
    payment_method: PaymentMethod
    status: SaleStatus
    notes: Optional[str] = None
    sale_date: datetime
    items: List[SaleItemRead]
    grand_total_kobo: int
    created_at: datetime

    @computed_field  # type: ignore[misc]
    @property
    def grand_total_ngn(self) -> float:
        return self.grand_total_kobo / 100

    model_config = {"from_attributes": True}


class SaleResponse(SaleRead):
    """Alias for SaleRead — computed grand_total_ngn is already included."""

    @classmethod
    def from_orm_with_ngn(cls, obj, items_data: List[dict]):
        # This is a helper because of how we calculate totals
        total_kobo = sum(item.total_kobo for item in obj.items)
        return cls(
            id=obj.id,
            payment_method=obj.payment_method,
            status=obj.status,
            notes=obj.notes,
            sale_date=obj.sale_date,
            items=items_data,
            grand_total_kobo=total_kobo,
            grand_total_ngn=total_kobo / 100,
            created_at=obj.created_at
        )
