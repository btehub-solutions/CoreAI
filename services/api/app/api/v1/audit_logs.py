from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from uuid import UUID
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.business import Business
from app.models.user import User
from app.schemas.common import PaginatedResponse, Meta
from app.dependencies import get_current_business, get_owner

from datetime import datetime

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])

@router.get("", response_model=PaginatedResponse[dict])
async def list_audit_logs(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    action: Optional[str] = Query(None),
    user_id: Optional[UUID] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditLog).where(
        AuditLog.business_id == business.id
    )
    
    if action:
        query = query.where(AuditLog.action == action)
    if user_id:
        query = query.where(AuditLog.user_id == user_id)
    if start_date:
        query = query.where(AuditLog.created_at >= start_date)
    if end_date:
        query = query.where(AuditLog.created_at <= end_date)
        
    query = query.order_by(AuditLog.created_at.desc())
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    
    # Pagination
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    logs = result.scalars().all()
    
    data = []
    for log in logs:
        data.append({
            "id": str(log.id),
            "user_id": str(log.user_id),
            "user_name": log.user_name,
            "user_role": log.user_role,
            "action": log.action,
            "resource": log.resource,
            "resource_id": log.resource_id,
            "detail": log.detail,
            "ip_address": log.ip_address,
            "created_at": log.created_at
        })
    
    return PaginatedResponse(
        data=data,
        meta=Meta(page=page, per_page=per_page, total=total)
    )
