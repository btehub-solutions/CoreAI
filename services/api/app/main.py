from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time
import uuid
import structlog
from app.config import settings
from app.api.v1 import router as api_v1_router

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Starting up CoreAI API",
        environment=settings.environment,
        redis_configured=bool(settings.redis_url),
    )
    yield
    logger.info("Shutting down CoreAI API")


app = FastAPI(
    title=settings.app_name,
    description="CoreAI Backend API",
    version="1.0.0",
    lifespan=lifespan,
    # Disable docs in production for security
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# --- CORS ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time"],
)


# --- Request ID + Timing Middleware ---
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(request_id=request_id)

    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = str(round(process_time * 1000, 2)) + "ms"

    return response


# --- Routes ---
app.include_router(api_v1_router)


@app.get("/health", tags=["health"])
async def health_check():
    return {
        "status": "ok",
        "environment": settings.environment,
        "redis": "configured" if settings.redis_url else "not configured",
        "timestamp": time.time(),
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
