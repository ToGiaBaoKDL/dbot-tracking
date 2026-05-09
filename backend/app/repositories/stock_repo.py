from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.queries import build_stock_upsert_stmt
from app.models.models import Stock


class StockRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_all_active(self) -> list[Stock]:
        result = await self.session.execute(
            select(Stock).where(Stock.is_active.is_(True), Stock.is_index.is_(False))
        )
        return list(result.scalars().all())

    async def get_all_symbols(self) -> list[str]:
        result = await self.session.execute(
            select(Stock.symbol).where(Stock.is_active.is_(True), Stock.is_index.is_(False))
        )
        return list(result.scalars().all())

    async def upsert_stocks(self, symbols: list[str], is_index: bool = False) -> None:
        if not symbols:
            return
        stmt = build_stock_upsert_stmt(symbols, is_index)
        await self.session.execute(stmt)

    async def mark_inactive(self, symbols: list[str]) -> None:
        if not symbols:
            return
        from sqlalchemy import update

        await self.session.execute(
            update(Stock).where(Stock.symbol.in_(symbols)).values(is_active=False)
        )
