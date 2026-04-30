from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit_log import AuditLog
from app.models.user import User
import uuid

async def log_action(
    db: AsyncSession,
    user: User,
    action: str,
    resource: str,
    resource_id: str = None,
    detail: str = None,
    ip_address: str = None,
) -> None:
    entry = AuditLog(
        id=uuid.uuid4(),
        business_id=user.business_id,
        user_id=user.id,
        user_name=user.full_name,
        user_role=user.role.value,
        action=action,
        resource=resource,
        resource_id=str(resource_id) if resource_id else None,
        detail=detail,
        ip_address=ip_address,
    )
    db.add(entry)
    await db.flush()
