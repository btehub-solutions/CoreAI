from fastapi import APIRouter, Depends
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import date
import json
import redis.asyncio as redis
from app.database import get_db
from app.services.analytics import AnalyticsService
from app.schemas.dashboard import DashboardResponse
from app.schemas.common import ApiResponse
from app.dependencies import get_current_business, get_owner
from app.models.business import Business
from app.models.user import User
from app.config import settings

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

async def get_redis():
    if not settings.redis_url:
        yield None
        return
    try:
        r = redis.from_url(settings.redis_url, decode_responses=True)
        async with r:
            yield r
    except Exception:
        yield None

@router.get("", response_model=ApiResponse[DashboardResponse])
async def get_dashboard(
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
    r: Optional[redis.Redis] = Depends(get_redis)
):
    today = date.today().isoformat()
    cache_key = f"dashboard:{business.id}:{today}"
    
    # Try cache
    if r:
        try:
            cached_data = await r.get(cache_key)
            if cached_data:
                return ApiResponse(data=DashboardResponse(**json.loads(cached_data)))
        except Exception:
            pass
            
    # Fresh computation
    analytics_service = AnalyticsService(db)
    data = await analytics_service.get_dashboard(business.id)
    
    # Save to cache
    if r:
        try:
            # Redis stores as string, we need to convert UUIDs to strings
            # Pydantic's model_dump_json handles this well
            resp_model = DashboardResponse(**data)
            await r.set(cache_key, resp_model.model_dump_json(), ex=120)
        except Exception:
            pass
            
    return ApiResponse(data=data)
