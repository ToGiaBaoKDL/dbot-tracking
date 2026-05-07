from fastapi import APIRouter

from app.api.v1 import admin, auth, signals, stocks

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(stocks.router, prefix="/stocks", tags=["stocks"])
router.include_router(signals.router, prefix="/signals", tags=["signals"])
router.include_router(admin.router, prefix="/admin", tags=["admin"])
