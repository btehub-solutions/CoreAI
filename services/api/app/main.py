import sys
import os
import traceback

# Inject current directory into sys.path for Vercel module resolution
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.getcwd())

_startup_error = None
app = None

# Step 1: Try to import FastAPI
try:
    from fastapi import FastAPI, Request, Depends
    from fastapi.responses import JSONResponse
    from fastapi.middleware.cors import CORSMiddleware
    from sqlalchemy.ext.asyncio import AsyncSession
    from app.database import get_db
    
    app = FastAPI(title="CoreAI API", version="1.0.0")
except Exception:
    _startup_error = traceback.format_exc()
    print(f"CRITICAL FASTAPI IMPORT ERROR: {_startup_error}")

# Step 2: If FastAPI is loaded, try to load the rest of the app
if app and not _startup_error:
    try:
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
        async def health_check(db: AsyncSession = Depends(get_db)):
            db_status = "error"
            tables_status = "unknown"
            try:
                from sqlalchemy import text
                await db.execute(text("SELECT 1"))
                db_status = "ok"
                
                # Check if 'users' table exists
                result = await db.execute(text(
                    "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')"
                ))
                tables_exist = result.scalar()
                tables_status = "initialized" if tables_exist else "missing (run migrations)"
            except Exception as e:
                db_status = f"error: {str(e)}"

            return {
                "status": "ok",
                "database": db_status,
                "tables": tables_status,
                "environment": settings.environment,
                "version": "1.0.0",
            }

        app.include_router(v1_router, prefix="/api/v1")

        @app.exception_handler(Exception)
        async def global_exception_handler(request: Request, exc: Exception):
            err_trace = traceback.format_exc()
            logger.exception(
                "Unhandled request error",
                extra={"request_id": getattr(request.state, "request_id", None)},
            )
            
            # Use 'detail' for frontend compatibility
            message = str(exc) if settings.debug else "An unexpected error occurred."
            return JSONResponse(
                status_code=500,
                content={
                    "success": False,
                    "error": "Internal Server Error",
                    "detail": message,
                    "message": message,
                    "traceback": err_trace if settings.debug else None
                }
            )

        @app.api_route("/{path_name:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
        async def catch_all(request: Request, path_name: str):
            return JSONResponse(
                status_code=404,
                content={"error": "Not Found", "path": path_name}
            )

    except Exception:
        _startup_error = traceback.format_exc()
        print(f"APP INITIALIZATION ERROR: {_startup_error}")

# Step 3: If anything failed, provide a fallback ASGI app or error handler
if _startup_error:
    # If FastAPI was partially loaded, we might be able to use it, 
    # but it's safer to provide a direct ASGI handler if we want to be sure.
    
    async def error_app(scope, receive, send):
        if scope['type'] == 'http':
            content = f"CoreAI Startup Error:\n\n{_startup_error}".encode('utf-8')
            await send({
                'type': 'http.response.start',
                'status': 500,
                'headers': [
                    [b'content-type', b'text/plain'],
                    [b'content-length', str(len(content)).encode('utf-8')],
                ],
            })
            await send({
                'type': 'http.response.body',
                'body': content,
            })
    
    # Override app with error_app if it failed or if we want to force the error view
    app = error_app
