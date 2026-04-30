from sqlalchemy import Column, String, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.models.base import TimestampedBase, GUID

class AuditLog(TimestampedBase):
    __tablename__ = "audit_logs"

    business_id = Column(GUID(), ForeignKey("businesses.id"),
                         nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id"),
                     nullable=False)
    user_name = Column(String(120), nullable=False)
    user_role = Column(String(20), nullable=False)
    action = Column(String(80), nullable=False)
    resource = Column(String(80), nullable=False)
    resource_id = Column(String(80), nullable=True)
    detail = Column(Text, nullable=True)
    ip_address = Column(String(45), nullable=True)

    business = relationship("Business")
    user = relationship("User")
