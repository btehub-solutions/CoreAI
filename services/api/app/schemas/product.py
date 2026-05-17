from pydantic import BaseModel, field_validator, computed_field, Field
from uuid import UUID
from datetime import datetime
from typing import Optional

class ProductBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    sku: Optional[str] = Field(default=None, max_length=80)
    category: Optional[str] = Field(default=None, max_length=80)
    unit: str = Field(default="unit", min_length=1, max_length=20)
    low_stock_threshold: int = Field(default=5, ge=0)

class ProductCreate(ProductBase):
    selling_price_ngn: float = Field(ge=0)
    cost_price_ngn: float = Field(ge=0)
    stock_quantity: int = Field(ge=0)

    @field_validator("stock_quantity")
    @classmethod
    def validate_stock(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Stock quantity cannot be negative")
        return v

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    sku: Optional[str] = Field(default=None, max_length=80)
    category: Optional[str] = Field(default=None, max_length=80)
    unit: Optional[str] = Field(default=None, min_length=1, max_length=20)
    low_stock_threshold: Optional[int] = Field(default=None, ge=0)
    selling_price_ngn: Optional[float] = Field(default=None, ge=0)
    cost_price_ngn: Optional[float] = Field(default=None, ge=0)
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None

    @field_validator("stock_quantity")
    @classmethod
    def validate_stock(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and v < 0:
            raise ValueError("Stock quantity cannot be negative")
        return v

class ProductRead(ProductBase):
    id: UUID
    selling_price_kobo: int
    cost_price_kobo: int
    stock_quantity: int
    is_active: bool
    created_at: datetime

    @computed_field  # type: ignore[misc]
    @property
    def selling_price_ngn(self) -> float:
        return self.selling_price_kobo / 100

    @computed_field  # type: ignore[misc]
    @property
    def cost_price_ngn(self) -> float:
        return self.cost_price_kobo / 100

    @computed_field  # type: ignore[misc]
    @property
    def is_low_stock(self) -> bool:
        return self.stock_quantity <= self.low_stock_threshold

    model_config = {"from_attributes": True}


class ProductResponse(ProductRead):
    """Alias for ProductRead — computed fields are already included."""

    @classmethod
    def from_orm_with_ngn(cls, obj):
        return cls.model_validate(obj)

class StockAdjustmentRequest(BaseModel):
    adjustment: int
    reason: Optional[str] = None
