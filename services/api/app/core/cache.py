import redis.asyncio as redis
from datetime import date
from app.config import settings


async def invalidate_dashboard_cache(business_id: str) -> None:
    """Invalidate cached dashboard keys for the given business.

    Fails silently — cache is non-critical and Redis may not be configured
    in all environments (e.g., Vercel serverless without Upstash).
    """
    if not settings.redis_url:
        return

    try:
        r = redis.from_url(settings.redis_url)
        async with r:
            today = date.today().isoformat()
            await r.delete(f"dashboard:{str(business_id)}:{today}")
            await r.delete(f"brief:{str(business_id)}:{today}")
            await r.delete(f"alerts:{str(business_id)}:{today}")
    except Exception:
        # Fail silently — cache invalidation is non-critical
        pass
