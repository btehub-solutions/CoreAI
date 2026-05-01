from contextlib import asynccontextmanager
import sys
import traceback
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI(title="CoreAI API", version="1.0.0")

try:
    from fastapi.middleware.cors import CORSMiddleware
    from app.config import settings
    import uuid
    import logging
    from app.api.v1 import router as v1_router

    logger = logging.getLogger(__name__)
    
    app.docs_url = "/docs" if settings.debug else None
    app.redoc_url = None

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def inject_request_id(request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.get("/health")
    async def health_check():
        return {
            "status": "ok",
            "environment": settings.environment,
            "version": "1.0.0",
        }

    app.include_router(v1_router, prefix="/api/v1")

except Exception as e:
    error_traceback = traceback.format_exc()
    @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
    async def catch_all(path_name: str):
        return JSONResponse(
            status_code=500,
            content={"error": "Startup Import Error", "traceback": error_traceback}
        )
