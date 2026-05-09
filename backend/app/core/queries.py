"""Shared database queries used by both async repositories and sync ETL."""

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import insert

from app.models.models import Stock, StockDailyData


def build_stock_upsert_stmt(symbols: list[str], is_index: bool = False):
    """Build INSERT ... ON CONFLICT DO NOTHING for stocks."""
    if not symbols:
        return None
    values = [{"symbol": s, "is_index": is_index, "is_active": True} for s in symbols]
    return insert(Stock).values(values).on_conflict_do_nothing(index_elements=["symbol"])


def build_daily_upsert_stmt(records: list[dict]):
    """Build INSERT ... ON CONFLICT DO UPDATE for stock_daily_data."""
    if not records:
        return None
    stmt = insert(StockDailyData).values(records)
    return stmt.on_conflict_do_update(
        index_elements=["symbol", "record_date"],
        set_={
            "close_price": stmt.excluded.close_price,
            "volume": stmt.excluded.volume,
            "prev_price": stmt.excluded.prev_price,
            "signal": stmt.excluded.signal,
            "updated_at": func.now(),
        },
    )
