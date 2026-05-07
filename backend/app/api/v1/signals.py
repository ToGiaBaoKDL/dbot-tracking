from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.schemas.schemas import SignalsResponse
from app.services.services import SignalService

router = APIRouter()


@router.get("", response_model=SignalsResponse)
async def get_signals(
    target_date: date = Query(..., alias="date"),
    future_days: int = Query(7, ge=1, le=14),
    symbol: str | None = Query(None, min_length=1, max_length=20),
    signal_type: str = Query("ALL", pattern="^(BUY|SELL|ALL)$"),
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = SignalService(db)
    signal_types = ["BUY", "SELL"] if signal_type == "ALL" else [signal_type]
    return await service.get_signals(target_date, future_days, symbol, signal_types)
