from fastapi import APIRouter
from app.api.v1.auth import router as auth_router
from app.api.v1.products import router as products_router
from app.api.v1.sales import router as sales_router
from app.api.v1.expenses import router as expenses_router
from app.api.v1.refunds import router as refunds_router
from app.api.v1.dashboard import router as dashboard_router
from app.api.v1.staff import router as staff_router
from app.api.v1.audit_logs import router as audit_logs_router
from app.api.v1.ai import router as ai_router

router = APIRouter()
router.include_router(auth_router)
router.include_router(products_router)
router.include_router(sales_router)
router.include_router(expenses_router)
router.include_router(refunds_router)
router.include_router(dashboard_router)
router.include_router(staff_router)
router.include_router(audit_logs_router)
router.include_router(ai_router, prefix="/ai", tags=["ai"])
