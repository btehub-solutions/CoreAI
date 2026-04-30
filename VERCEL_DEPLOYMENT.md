# CoreAI Vercel Deployment Guide

Your project is now fully prepared for production hosting on Vercel using industry best practices for a Python/Next.js monorepo. This guide outlines the final steps to go live.

## 🚀 Deployment Strategy

We have configured the project to support **two independent Vercel projects** (Frontend and Backend). This is the most robust and scalable approach.

### 1. Backend Deployment (`services/api`)

The FastAPI backend is ready for Vercel's Python runtime.

- **Root Directory**: `services/api`
- **Framework Preset**: `Other` (detected via `vercel.json`)
- **Required Environment Variables**:
  - `DATABASE_URL`: Your production PostgreSQL URL (e.g., Neon, Supabase, or Railway).
  - `SECRET_KEY`: A secure 32-character hex string (`python -c "import secrets; print(secrets.token_hex(32))"`).
  - `ENVIRONMENT`: `production`
  - `ALLOWED_ORIGINS`: `["https://your-frontend.vercel.app"]`
  - `GEMINI_API_KEY`: Your Google GenAI key.

> [!IMPORTANT]
> **Database**: SQLite will not work on Vercel because it is ephemeral. You **must** use a managed PostgreSQL provider. The code is already configured to use `NullPool` in production to prevent connection exhaustion.

### 2. Frontend Deployment (`apps/web`)

The Next.js frontend is optimized for Vercel.

- **Root Directory**: `apps/web`
- **Framework Preset**: `Next.js`
- **Build Command**: `pnpm build`
- **Required Environment Variables**:
  - `NEXT_PUBLIC_API_URL`: The URL of your deployed backend (e.g., `https://coreai-api.vercel.app`).

---

## 🛠️ Best Practices Implemented

- **Connection Pooling**: Implemented `NullPool` for the FastAPI backend, which is mandatory for serverless environments to avoid "Too many connections" errors.
- **Graceful Degradation**: Redis is now optional. If `REDIS_URL` is not provided, the app will automatically skip caching without crashing.
- **Security Headers**: Both `vercel.json` files include hardened security headers (`X-Frame-Options`, `X-Content-Type-Options`, etc.).
- **Monorepo Scripts**: Added a root `package.json` to allow you to run `pnpm dev:web` or `pnpm dev:api` from the base folder.
- **Async Migrations**: Alembic is fully configured to handle async PostgreSQL connections.

---

## 📝 Post-Deployment Checklist

1. [ ] **Run Migrations**: Once your production DB is linked, run migrations from your local machine (with the prod URL in your local `.env`) or via a GitHub Action:
   ```bash
   cd services/api
   alembic upgrade head
   ```
2. [ ] **CORS Verification**: Ensure the backend's `ALLOWED_ORIGINS` exactly matches your frontend's deployment URL.
3. [ ] **AI Model Check**: Verify `AI_MODEL` is set to your preferred model (e.g., `gemini-2.0-flash`).

---

## 🔗 Useful Links
- [Vercel Monorepo Docs](https://vercel.com/docs/projects/overview#monorepos)
- [FastAPI on Vercel](https://vercel.com/docs/functions/runtimes/python)
