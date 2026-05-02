import enum
from datetime import datetime
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import TimestampedBase, GUID

class PaymentMethod(str, enum.Enum):
    CASH = "cash"
    TRANSFER = "transfer"
    POS = "pos"
    USSD = "ussd"

class SaleStatus(str, enum.Enum):
    COMPLETED = "completed"
    REFUNDED = "refunded"
    PARTIAL_REFUND = "partial_refund"

class Sale(TimestampedBase):
    __tablename__ = "sales"
    business_id = Column(GUID(), ForeignKey("businesses.id"),
                         nullable=False, index=True)
    payment_method = Column(Enum(PaymentMethod, values_callable=lambda x: [e.value for e in x]), nullable=False)
    status = Column(Enum(SaleStatus, values_callable=lambda x: [e.value for e in x]), default=SaleStatus.COMPLETED, nullable=False)
    notes = Column(Text, nullable=True)
    sale_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    business = relationship("Business", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale",
                         cascade="all, delete-orphan")
    refunds = relationship("Refund", back_populates="sale")
    
    @property
    def total_kobo(self) -> int:
        return sum(item.total_kobo for item in self.items)

class SaleItem(TimestampedBase):
    __tablename__ = "sale_items"
    sale_id = Column(GUID(), ForeignKey("sales.id"),
                     nullable=False, index=True)
    product_id = Column(GUID(), ForeignKey("products.id"),
                        nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price_kobo = Column(Integer, nullable=False)
    total_kobo = Column(Integer, nullable=False)
    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")
