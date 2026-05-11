from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import Watchlist


class WatchlistRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_user(self, user_id: int) -> list[Watchlist]:
        result = await self.session.execute(
            select(Watchlist).where(Watchlist.user_id == user_id).order_by(Watchlist.symbol)
        )
        return list(result.scalars().all())

    async def get_symbols_by_user(self, user_id: int) -> list[str]:
        result = await self.session.execute(
            select(Watchlist.symbol).where(Watchlist.user_id == user_id).order_by(Watchlist.symbol)
        )
        return list(result.scalars().all())

    async def add(self, user_id: int, symbol: str) -> Watchlist:
        item = Watchlist(user_id=user_id, symbol=symbol)
        self.session.add(item)
        await self.session.flush()
        await self.session.refresh(item)
        return item

    async def remove(self, user_id: int, symbol: str) -> bool:
        result = await self.session.execute(
            delete(Watchlist).where(Watchlist.user_id == user_id, Watchlist.symbol == symbol)
        )
        return result.rowcount > 0  # type: ignore[attr-defined]

    async def exists(self, user_id: int, symbol: str) -> bool:
        result = await self.session.execute(
            select(Watchlist).where(Watchlist.user_id == user_id, Watchlist.symbol == symbol)
        )
        return result.scalar_one_or_none() is not None
