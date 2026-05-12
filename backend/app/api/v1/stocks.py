from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.schemas.schemas import StockHistoryItem
from app.services.services import StockService

router = APIRouter()


@router.get("", response_model=dict[str, list[str]])
async def list_stocks(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = StockService(db)
    symbols = await service.get_all_symbols()
    return {"symbols": symbols}


@router.get("/{symbol}/history", response_model=list[StockHistoryItem])
async def get_stock_history(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = StockService(db)
    return await service.get_stock_history(symbol)
