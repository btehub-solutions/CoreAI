from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool
from app.config import settings

# Serverless environments (Vercel) don't support persistent connection pools —
# each function invocation is stateless. Use NullPool to open/close a fresh
# connection per request and avoid exhausting PostgreSQL's connection limit.
# For long-running servers (Docker / Railway) the default AsyncAdaptedQueuePool
# is more efficient, so we switch based on the environment flag.
_pool_class = NullPool if settings.is_production else AsyncAdaptedQueuePool

engine = create_async_engine(
    settings.database_url,
    echo=settings.debug,
    poolclass=_pool_class,
    # These only apply when NOT using NullPool (i.e., local dev)
    **(
        {}
        if settings.is_production
        else {
            "pool_size": 5,
            "max_overflow": 10,
            "pool_pre_ping": True,
        }
    ),
)

AsyncSessionLocal = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
