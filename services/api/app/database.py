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

db_url = settings.database_url
if db_url:
    # Handle the pgbouncer=true parameter which asyncpg doesn't recognize
    if "pgbouncer=true" in db_url.lower():
        db_url = db_url.replace("pgbouncer=true", "")
        db_url = db_url.replace("&&", "&").replace("?&", "?").rstrip("?").rstrip("&")

    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

if db_url:
    engine = create_async_engine(
        db_url,
        echo=settings.debug,
        poolclass=_pool_class,
        connect_args={
            "statement_cache_size": 0,
            "prepared_statement_cache_size": 0,
        },
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
else:
    engine = None
    AsyncSessionLocal = None


class Base(DeclarativeBase):
    pass


async def get_db():
    if AsyncSessionLocal is None:
        raise Exception("DATABASE_URL is not configured in environment variables.")
    async with AsyncSessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
