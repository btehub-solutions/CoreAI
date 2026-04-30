import enum
from sqlalchemy import Column, Integer, String, Enum, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from app.models.base import TimestampedBase, GUID

class StaffRole(str, enum.Enum):
    OWNER = "owner"
    MANAGER = "manager"
    CASHIER = "cashier"
    WORKER = "worker"

class Staff(TimestampedBase):
    __tablename__ = "staff"
    business_id = Column(GUID(), ForeignKey("businesses.id"),
                         nullable=False, index=True)
    full_name = Column(String(120), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(StaffRole), nullable=False, default=StaffRole.WORKER)
    salary_kobo = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    deleted_at = Column(DateTime, nullable=True)
    
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=True)
    
    business = relationship("Business", back_populates="staff")
    user = relationship("User")
