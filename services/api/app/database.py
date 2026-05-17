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

import os

db_url = (
    os.getenv("POSTGRES_URL_NON_POOLING") or 
    settings.database_url or 
    os.getenv("POSTGRES_URL") or 
    os.getenv("POSTGRES_PRISMA_URL")
)
if db_url:
    # Handle the pgbouncer=true parameter which asyncpg doesn't recognize
    if "pgbouncer=true" in db_url.lower():
        db_url = db_url.replace("pgbouncer=true", "")
    
    if "sslmode=" in db_url.lower():
        db_url = db_url.replace("sslmode=", "ssl=")
        
    db_url = db_url.replace("&&", "&").replace("?&", "?").rstrip("?").rstrip("&")

    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql+asyncpg://", 1)

    # Add prepared_statement_cache_size=0 to disable caching for PgBouncer
    if db_url.startswith("postgresql+asyncpg"):
        separator = "&" if "?" in db_url else "?"
        db_url = f"{db_url}{separator}prepared_statement_cache_size=0"

if db_url:
    engine = create_async_engine(
        db_url,
        echo=settings.debug,
        poolclass=_pool_class,
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
