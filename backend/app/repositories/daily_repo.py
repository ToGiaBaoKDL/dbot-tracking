from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.queries import build_daily_upsert_stmt
from app.models.models import StockDailyData


class StockDailyDataRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def upsert_many(self, records: list[dict]) -> None:
        if not records:
            return
        stmt = build_daily_upsert_stmt(records)
        await self.session.execute(stmt)

    async def get_signals_by_date(
        self, target_date: date, signal_types: list[str], symbol: str | None = None
    ) -> list[StockDailyData]:
        stmt = (
            select(StockDailyData)
            .where(
                StockDailyData.record_date == target_date,
                StockDailyData.signal.in_(signal_types),
            )
            .order_by(StockDailyData.symbol)
        )
        if symbol:
            stmt = stmt.where(StockDailyData.symbol == symbol.upper())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_future_prices(
        self, symbols: list[str], start_date: date, end_date: date
    ) -> list[StockDailyData]:
        result = await self.session.execute(
            select(StockDailyData)
            .where(
                StockDailyData.symbol.in_(symbols),
                StockDailyData.record_date >= start_date,
                StockDailyData.record_date <= end_date,
            )
            .order_by(StockDailyData.symbol, StockDailyData.record_date)
        )
        return list(result.scalars().all())

    async def get_latest_date(self) -> date | None:
        result = await self.session.execute(
            select(StockDailyData.record_date).order_by(StockDailyData.record_date.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def get_distinct_dates(self) -> list[date]:
        result = await self.session.execute(
            select(StockDailyData.record_date)
            .distinct()
            .order_by(StockDailyData.record_date.desc())
        )
        return list(result.scalars().all())

    async def get_history_by_symbol(self, symbol: str) -> list[StockDailyData]:
        result = await self.session.execute(
            select(StockDailyData)
            .where(StockDailyData.symbol == symbol.upper())
            .order_by(StockDailyData.record_date.desc())
        )
        return list(result.scalars().all())
