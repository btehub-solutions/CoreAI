import os
from app.workers.celery_app import celery_app

if celery_app is None:
    class DummyCeleryApp:
        def task(self, *args, **kwargs):
            def decorator(func):
                return func
            return decorator
        def send_task(self, *args, **kwargs):
            pass
    celery_app = DummyCeleryApp()

def refresh_insights(business_id: str) -> None:
    if os.getenv("ENVIRONMENT") == "production":
        return
    if getattr(celery_app, "send_task", None):
        celery_app.send_task(
            "app.workers.insight_tasks._refresh_insights_task",
            args=[business_id]
        )

@celery_app.task(bind=True, max_retries=3)
def send_daily_briefs_all(self) -> None:
    import asyncio
    from sqlalchemy import select
    from app.database import AsyncSessionLocal
    from app.models.user import User
    from app.models.business import Business
    from app.services.ai_service import AIService
    from app.services.analytics import AnalyticsService
    from app.integrations.email_service import send_daily_brief_email
    from datetime import date

    async def run() -> None:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(User).where(
                    User.daily_brief_email_enabled.is_(True),
                    User.is_active.is_(True),
                )
            )
            users = result.scalars().all()

            for user in users:
                try:
                    biz_result = await db.execute(
                        select(Business).where(
                            Business.id == user.business_id
                        )
                    )
                    business = biz_result.scalar_one_or_none()
                    if not business:
                        continue

                    analytics = AnalyticsService(db)
                    today = date.today()
                    revenue = await analytics._sum_sales(
                        business.id, today)
                    expenses = await analytics._sum_expenses(
                        business.id, today)
                    count = await analytics._count_sales(
                        business.id, today)
                    profit = max(0, revenue - expenses)

                    ai = AIService(db)
                    brief = await ai.generate_daily_brief(
                        business.id,
                        business.name,
                        user.full_name.split()[0],
                    )

                    await send_daily_brief_email(
                        to_email=user.email,
                        owner_name=user.full_name,
                        business_name=business.name,
                        brief_content=brief,
                        revenue_kobo=revenue,
                        expenses_kobo=expenses,
                        profit_kobo=profit,
                        transaction_count=count,
                    )

                except Exception:
                    continue

    try:
        asyncio.run(run())
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
