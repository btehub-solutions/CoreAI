from sqlalchemy import Column, ForeignKey, Integer, String
from app.models.base import TimestampedBase, GUID


class AIUsageEvent(TimestampedBase):
    __tablename__ = "ai_usage_events"

    business_id = Column(GUID(), ForeignKey("businesses.id"), nullable=False, index=True)
    user_id = Column(GUID(), ForeignKey("users.id"), nullable=False, index=True)
    endpoint = Column(String(80), nullable=False)
    model = Column(String(120), nullable=False)
    status = Column(String(30), nullable=False)
    prompt_chars = Column(Integer, nullable=False, default=0)
    response_chars = Column(Integer, nullable=False, default=0)
    latency_ms = Column(Integer, nullable=False, default=0)
    error_code = Column(String(80), nullable=True)
