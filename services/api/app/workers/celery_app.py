import os

if os.getenv("ENVIRONMENT") == "production":
    celery_app = None
else:
    from celery import Celery
    from celery.schedules import crontab
    from app.config import settings

    celery_app = Celery(
        "coreai",
        broker=settings.redis_url,
        backend=settings.redis_url,
    )
    celery_app.conf.beat_schedule = {
        "send-daily-brief-emails": {
            "task": "app.workers.insight_tasks.send_daily_briefs_all",
            "schedule": crontab(hour=18, minute=0),
        },
    }
    celery_app.conf.timezone = "Africa/Lagos"

