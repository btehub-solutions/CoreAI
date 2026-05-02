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
    from fastapi import FastAPI, Request
    from fastapi.responses import JSONResponse
    from fastapi.middleware.cors import CORSMiddleware
    
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
        async def health_check():
            return {
                "status": "ok",
                "environment": settings.environment,
                "version": "1.0.0",
            }

        app.include_router(v1_router, prefix="/api/v1")

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
