from sqlalchemy import Column, Integer, String, ForeignKey, Boolean, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import TimestampedBase, GUID

class Product(TimestampedBase):
    __tablename__ = "products"
    business_id = Column(GUID(), ForeignKey("businesses.id"),
                         nullable=False, index=True)
    name = Column(String(120), nullable=False)
    sku = Column(String(80), nullable=True)
    category = Column(String(80), nullable=True)
    selling_price_kobo = Column(Integer, nullable=False, default=0)
    cost_price_kobo = Column(Integer, nullable=False, default=0)
    stock_quantity = Column(Integer, default=0, nullable=False)
    low_stock_threshold = Column(Integer, default=5, nullable=False)
    unit = Column(String(20), default="unit", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    business = relationship("Business", back_populates="products")
    sale_items = relationship("SaleItem", back_populates="product")
