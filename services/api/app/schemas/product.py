from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional

class ProductBase(BaseModel):
    name: str
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: str = "unit"
    low_stock_threshold: int = 5

class ProductCreate(ProductBase):
    selling_price_ngn: float
    cost_price_ngn: float
    stock_quantity: int

    @field_validator("stock_quantity")
    @classmethod
    def validate_stock(cls, v: int) -> int:
        if v < 0:
            raise ValueError("Stock quantity cannot be negative")
        return v

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    low_stock_threshold: Optional[int] = None
    selling_price_ngn: Optional[float] = None
    cost_price_ngn: Optional[float] = None
    stock_quantity: Optional[int] = None
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
    
    @property
    def selling_price_ngn(self) -> float:
        return self.selling_price_kobo / 100

    @property
    def cost_price_ngn(self) -> float:
        return self.cost_price_kobo / 100
    
    @property
    def is_low_stock(self) -> bool:
        return self.stock_quantity <= self.low_stock_threshold

    class Config:
        from_attributes = True
        # To include properties in response
        json_encoders = {
            datetime: lambda v: v.isoformat(),
        }

class ProductResponse(ProductRead):
    selling_price_ngn: float
    cost_price_ngn: float
    is_low_stock: bool

    @classmethod
    def from_orm_with_ngn(cls, obj):
        data = cls.from_orm(obj)
        data.selling_price_ngn = obj.selling_price_kobo / 100
        data.cost_price_ngn = obj.cost_price_kobo / 100
        data.is_low_stock = obj.stock_quantity <= obj.low_stock_threshold
        return data

class StockAdjustmentRequest(BaseModel):
    adjustment: int
    reason: Optional[str] = None
