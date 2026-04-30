import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, String, TypeDecorator
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

class GUID(TypeDecorator):
    """Platform-independent GUID type.
    Uses PostgreSQL's UUID type, otherwise uses String(32).
    """
    impl = String
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == 'postgresql':
            return dialect.type_descriptor(UUID(as_uuid=True))
        else:
            return dialect.type_descriptor(String(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == 'postgresql':
            return value if isinstance(value, uuid.UUID) else uuid.UUID(str(value))
        # For SQLite: always store as 32-char hex string without dashes
        if isinstance(value, uuid.UUID):
            return value.hex
        # It's already a string — strip dashes
        return str(value).replace('-', '')

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if isinstance(value, uuid.UUID):
            return value
        try:
            return uuid.UUID(value)
        except (ValueError, AttributeError):
            return value

class TimestampedBase(Base):
    __abstract__ = True
    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow,
                        onupdate=datetime.utcnow, nullable=False)
