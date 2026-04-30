import enum
from sqlalchemy import Column, String, Boolean, Enum, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from app.models.base import TimestampedBase, GUID

class UserRole(str, enum.Enum):
    OWNER = "owner"
    CASHIER = "cashier"

class User(TimestampedBase):
    __tablename__ = "users"
    full_name = Column(String(120), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.OWNER)
    is_active = Column(Boolean, default=True, nullable=False)
    business_id = Column(GUID(), ForeignKey("businesses.id"),
                         nullable=True, index=True)
    
    daily_brief_email_enabled = Column(Boolean, default=False, nullable=False)
    daily_brief_opted_in_at = Column(DateTime, nullable=True)

    business = relationship("Business", back_populates="users",
                            foreign_keys=[business_id])
