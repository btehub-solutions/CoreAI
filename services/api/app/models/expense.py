from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.models.base import TimestampedBase, GUID

class Expense(TimestampedBase):
    __tablename__ = "expenses"
    business_id = Column(GUID(), ForeignKey("businesses.id"),
                         nullable=False, index=True)
    category = Column(String(80), nullable=False)
    description = Column(String(255), nullable=True)
    amount_kobo = Column(Integer, nullable=False)
    expense_date = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    deleted_at = Column(DateTime, nullable=True)
    business = relationship("Business", back_populates="expenses")
