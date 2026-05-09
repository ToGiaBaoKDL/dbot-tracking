#!/usr/bin/env python3
"""Query signal statistics over a date range."""

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


def query(start_date: date, end_date: date):
    engine = _get_engine()
    sql = """
        SELECT
            record_date,
            COUNT(*) FILTER (WHERE signal = 'BUY') AS buy_count,
            COUNT(*) FILTER (WHERE signal = 'SELL') AS sell_count,
            COUNT(*) FILTER (WHERE signal IS NULL) AS null_count
        FROM stock_daily_data
        WHERE record_date BETWEEN :start AND :end
        GROUP BY record_date
        ORDER BY record_date
    """
    with engine.connect() as conn:
        rows = conn.execute(text(sql), {"start": start_date, "end": end_date}).fetchall()

    logger.info("%-12s %8s %8s %8s", "Date", "BUY", "SELL", "NULL")
    logger.info("-" * 40)
    for row in rows:
        logger.info("%-12s %8d %8d %8d", str(row[0]), row[1], row[2], row[3])


def main() -> int:
    parser = argparse.ArgumentParser(description="Signal statistics by date")
    parser.add_argument(
        "--start", type=date.fromisoformat, required=True, help="Start date (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--end", type=date.fromisoformat, required=True, help="End date (YYYY-MM-DD)"
    )
    args = parser.parse_args()

    query(args.start, args.end)
    return 0


if __name__ == "__main__":
    sys.exit(main())
