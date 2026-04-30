from fastapi import APIRouter, Depends, Request, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
import redis.asyncio as aioredis
import json
from datetime import date
from typing import Optional

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.business import Business
from app.dependencies import get_owner, get_current_business
from app.services.ai_service import AIService
from app.schemas.common import ApiResponse

router = APIRouter()


async def _get_redis() -> Optional[aioredis.Redis]:
    """Return a Redis client if REDIS_URL is configured, otherwise None.

    All callers guard with `if redis:` so the app works without Redis.
    """
    if not settings.redis_url:
        return None
    try:
        return aioredis.from_url(settings.redis_url, decode_responses=True)
    except Exception:
        return None


async def _close_redis(r: Optional[aioredis.Redis]) -> None:
    if r:
        try:
            await r.aclose()
        except Exception:
            pass


@router.post("/daily-brief")
async def get_daily_brief(
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
):
    redis = await _get_redis()
    today = date.today().isoformat()
    cache_key = f"brief:{str(business.id)}:{today}"

    if redis:
        try:
            cached = await redis.get(cache_key)
            if cached:
                await _close_redis(redis)
                return ApiResponse(data={
                    "content": cached,
                    "generated_at": today,
                    "cached": True,
                })
        except Exception:
            pass

    ai = AIService(db)
    brief = await ai.generate_daily_brief(
        business.id,
        business.name,
        current_user.full_name.split()[0],
    )

    if redis:
        try:
            await redis.setex(cache_key, 14400, brief)
        except Exception:
            pass
        finally:
            await _close_redis(redis)

    return ApiResponse(data={
        "content": brief,
        "generated_at": today,
        "cached": False,
    })


@router.get("/tomorrow")
async def get_tomorrow_brief(
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
):
    redis = await _get_redis()
    today = date.today().isoformat()
    cache_key = f"tomorrow:{str(business.id)}:{today}"

    if redis:
        try:
            cached = await redis.get(cache_key)
            if cached:
                await _close_redis(redis)
                return ApiResponse(data={"cards": json.loads(cached)})
        except Exception:
            pass

    ai = AIService(db)
    cards = await ai.generate_tomorrow_brief(business.id)

    if redis:
        try:
            await redis.setex(cache_key, 21600, json.dumps(cards))
        except Exception:
            pass
        finally:
            await _close_redis(redis)

    return ApiResponse(data={"cards": cards})


@router.post("/chat")
async def chat(
    payload: dict,
    request: Request,
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
):
    message = payload.get("message", "").strip()
    history = payload.get("history", [])

    if not message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    ai = AIService(db)

    async def event_stream():
        try:
            async for token in ai.stream_chat(business.id, message, history):
                if await request.is_disconnected():
                    break
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception:
            yield f"data: {json.dumps({'error': 'Stream interrupted'})}\n\n"
            yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
            "Transfer-Encoding": "chunked",
        },
    )


@router.get("/alerts")
async def get_smart_alerts(
    current_user: User = Depends(get_owner),
    business: Business = Depends(get_current_business),
    db: AsyncSession = Depends(get_db),
):
    redis = await _get_redis()
    today = date.today().isoformat()
    cache_key = f"alerts:{str(business.id)}:{today}"

    if redis:
        try:
            cached = await redis.get(cache_key)
            if cached:
                await _close_redis(redis)
                return ApiResponse(data={"alerts": json.loads(cached)})
        except Exception:
            pass

    ai = AIService(db)
    alerts = await ai.generate_smart_alerts(business.id)

    if redis:
        try:
            await redis.setex(cache_key, 1800, json.dumps(alerts))
        except Exception:
            pass
        finally:
            await _close_redis(redis)

    return ApiResponse(data={"alerts": alerts})


@router.patch("/email-preferences")
async def update_email_preferences(
    payload: dict,
    current_user: User = Depends(get_owner),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime

    enabled = payload.get("daily_brief_email_enabled")

    if enabled is None:
        raise HTTPException(
            status_code=400,
            detail="daily_brief_email_enabled is required"
        )

    current_user.daily_brief_email_enabled = enabled
    if enabled:
        current_user.daily_brief_opted_in_at = datetime.utcnow()
    await db.commit()

    return ApiResponse(
        data={"daily_brief_email_enabled": enabled},
        message="Email preferences updated"
    )
