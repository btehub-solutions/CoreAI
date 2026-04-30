from celery import Celery
from celery.schedules import crontab
from app.config import settings

# Celery requires Redis as broker — only initialised when REDIS_URL is set.
# On Vercel serverless (no persistent process) Celery workers don't run;
# scheduled tasks must be triggered externally (e.g., Vercel Cron Jobs or a
# dedicated worker on Railway/Render).
_broker = settings.redis_url or "memory://"
_backend = settings.redis_url or "cache+memory://"

celery_app = Celery(
    "coreai",
    broker=_broker,
    backend=_backend,
)

celery_app.conf.beat_schedule = {
    "send-daily-brief-emails": {
        "task": "app.workers.insight_tasks.send_daily_briefs_all",
        "schedule": crontab(hour=18, minute=0),
    },
}

celery_app.conf.timezone = "Africa/Lagos"
