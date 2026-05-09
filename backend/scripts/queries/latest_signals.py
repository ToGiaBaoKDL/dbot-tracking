#!/usr/bin/env python3
"""Query latest signals for a given date."""

import argparse
import logging
import os
import sys
from datetime import date

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.core.db_url import to_sync_url

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("dbot-etl")


def _get_engine() -> Engine:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return create_engine(to_sync_url(url), future=True, pool_pre_ping=True)


def query(target_date: date, signal_type: str | None, limit: int):
    engine = _get_engine()
    sql = """
        SELECT symbol, record_date, close_price, volume, signal
        FROM stock_daily_data
        WHERE record_date = :d
    """
    params: dict = {"d": target_date, "limit": limit}

    if signal_type:
        sql += " AND signal = :signal"
        params["signal"] = signal_type.upper()
    else:
        sql += " AND signal IS NOT NULL"

    sql += " ORDER BY symbol LIMIT :limit"

    with engine.connect() as conn:
        rows = conn.execute(text(sql), params).fetchall()

    logger.info("%-10s %-12s %10s %12s %-6s", "Symbol", "Date", "Price", "Volume", "Signal")
    logger.info("-" * 60)
    for row in rows:
        logger.info(
            "%-10s %-12s %10.2f %12,d %-6s",
            row[0],
            row[1],
            row[2] or 0,
            row[3] or 0,
            row[4] or "",
        )
    logger.info("Total rows: %d", len(rows))


def main() -> int:
    parser = argparse.ArgumentParser(description="Query latest signals")
    parser.add_argument(
        "--date", type=date.fromisoformat, default=date.today(), help="Date (YYYY-MM-DD)"
    )
    parser.add_argument("--signal", choices=["BUY", "SELL"], help="Filter by signal type")
    parser.add_argument("--limit", type=int, default=50, help="Max rows")
    args = parser.parse_args()

    query(args.date, args.signal, args.limit)
    return 0


if __name__ == "__main__":
    sys.exit(main())
