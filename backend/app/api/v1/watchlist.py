from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.schemas.schemas import WatchlistCreate, WatchlistItem, WatchlistWithLatestSignal
from app.services.services import WatchlistService

router = APIRouter()


@router.get("", response_model=list[WatchlistWithLatestSignal])
async def get_watchlist(
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = WatchlistService(db)
    return await service.get_watchlist(current_user["id"])


@router.post("", response_model=WatchlistItem, status_code=status.HTTP_201_CREATED)
async def add_to_watchlist(
    data: WatchlistCreate,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = WatchlistService(db)
    try:
        return await service.add_symbol(current_user["id"], data.symbol)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        ) from None


@router.delete("/{symbol}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_watchlist(
    symbol: str,
    db: AsyncSession = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    service = WatchlistService(db)
    deleted = await service.remove_symbol(current_user["id"], symbol)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mã {symbol} không có trong danh sách theo dõi",
        )
