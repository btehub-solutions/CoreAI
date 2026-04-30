from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import TimestampedBase, GUID

class Refund(TimestampedBase):
    __tablename__ = "refunds"
    business_id = Column(GUID(), ForeignKey("businesses.id"),
                         nullable=False, index=True)
    sale_id = Column(GUID(), ForeignKey("sales.id"),
                     nullable=False)
    reason = Column(String(255), nullable=True)
    amount_kobo = Column(Integer, nullable=False)
    restock = Column(String(10), default="yes", nullable=False)
    refund_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    sale = relationship("Sale", back_populates="refunds")
