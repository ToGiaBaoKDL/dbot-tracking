"""ETL module for DBOT stock data crawling."""

import os

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.core.db_url import to_sync_url
from app.core.encryption import decrypt_value
from app.core.queries import build_daily_upsert_stmt, build_stock_upsert_stmt


def _get_sync_url() -> str:
    """Derive sync DB URL from async URL."""
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return to_sync_url(url)


_engine: Engine | None = None


def _get_engine() -> Engine:
    global _engine
    if _engine is None:
        _engine = create_engine(_get_sync_url(), future=True, pool_pre_ping=True)
    return _engine


def get_dbot_token() -> str:
    """Get the latest DBOT token from backend DB."""
    engine = _get_engine()
    with engine.connect() as conn:
        result = conn.execute(text("SELECT token FROM dbot_token ORDER BY updated_at DESC LIMIT 1"))
        row = result.fetchone()
        if not row:
            raise RuntimeError("No DBOT token found. Please set token via admin API.")
        raw = row[0]
        try:
            return decrypt_value(raw)
        except Exception:
            return raw  # May be unencrypted legacy token


def save_symbols(symbols: list[str]) -> None:
    """Upsert stock symbols."""
    if not symbols:
        return
    stmt = build_stock_upsert_stmt(symbols)
    engine = _get_engine()
    with engine.begin() as conn:
        conn.execute(stmt)


def save_daily_records(records: list[dict]) -> None:
    """Upsert daily records."""
    if not records:
        return
    batch_size = 1000
    engine = _get_engine()
    with engine.begin() as conn:
        for i in range(0, len(records), batch_size):
            batch = records[i : i + batch_size]
            stmt = build_daily_upsert_stmt(batch)
            conn.execute(stmt)
