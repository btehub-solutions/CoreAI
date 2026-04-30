import enum
from sqlalchemy import Column, String, Enum, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.models.base import TimestampedBase, GUID

class SectorType(str, enum.Enum):
    SUPERMARKET = "supermarket"
    PHARMACY = "pharmacy"
    POS = "pos"
    FOOD_VENDOR = "food_vendor"
    FASHION = "fashion"
    LOGISTICS = "logistics"
    REAL_ESTATE = "real_estate"
    TECH_REPAIRS = "tech_repairs"
    EDUCATION = "education"
    AGRICULTURE = "agriculture"
    OTHER = "other"

class Business(TimestampedBase):
    __tablename__ = "businesses"
    name = Column(String(120), nullable=False)
    sector = Column(Enum(SectorType), nullable=False)
    owner_id = Column(GUID(), ForeignKey("users.id"),
                      nullable=False, unique=True)
    phone = Column(String(20), nullable=True)
    city = Column(String(80), nullable=True)
    state = Column(String(80), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    owner = relationship("User", foreign_keys=[owner_id])
    users = relationship("User", back_populates="business",
                         foreign_keys="User.business_id")
    products = relationship("Product", back_populates="business",
                            cascade="all, delete-orphan")
    sales = relationship("Sale", back_populates="business",
                         cascade="all, delete-orphan")
    expenses = relationship("Expense", back_populates="business",
                            cascade="all, delete-orphan")
    staff = relationship("Staff", back_populates="business",
                         cascade="all, delete-orphan")
