"""
Vercel Serverless Entry Point for CoreAI FastAPI Backend.

Vercel routes all traffic through this file via the ASGI handler.
The 'app' object is imported from our main FastAPI application.
"""
import sys
import os

# Ensure the parent directory (services/api) is on the path so
# our `app` package can be found when Vercel executes this file.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app  # noqa: F401 — re-exported for Vercel

# Vercel expects the ASGI callable to be named `app` at module level.
# The import above satisfies this requirement.
