#!/usr/bin/env python3
"""Validate overall database state and print summary."""

import logging
import os
import sys

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


def validate() -> dict:
    engine = _get_engine()
    with engine.connect() as conn:
        total_records = conn.execute(text("SELECT COUNT(*) FROM stock_daily_data")).scalar()

        total_symbols = conn.execute(text("SELECT COUNT(*) FROM stocks")).scalar()

        date_range = conn.execute(
            text("SELECT MIN(record_date), MAX(record_date) FROM stock_daily_data")
        ).fetchone()

        signal_counts = conn.execute(
            text(
                "SELECT signal, COUNT(*) FROM stock_daily_data WHERE signal IS NOT NULL GROUP BY signal"
            )
        ).fetchall()

        latest_date = conn.execute(
            text(
                "SELECT record_date, COUNT(*) FROM stock_daily_data WHERE record_date = (SELECT MAX(record_date) FROM stock_daily_data) GROUP BY record_date"
            )
        ).fetchone()

        token_exists = conn.execute(text("SELECT COUNT(*) FROM dbot_token")).scalar()

    return {
        "total_records": total_records,
        "total_symbols": total_symbols,
        "min_date": str(date_range[0]) if date_range[0] else None,
        "max_date": str(date_range[1]) if date_range[1] else None,
        "signal_counts": {row[0]: row[1] for row in signal_counts},
        "latest_date": str(latest_date[0]) if latest_date else None,
        "latest_count": latest_date[1] if latest_date else 0,
        "token_configured": token_exists > 0,
    }


def main() -> int:
    logger.info("Running database overview validation")
    stats = validate()

    logger.info("=" * 50)
    logger.info("Database Overview")
    logger.info("=" * 50)
    logger.info("Total records: %(total_records)s", stats)
    logger.info("Total symbols: %(total_symbols)s", stats)
    logger.info("Date range: %(min_date)s to %(max_date)s", stats)
    logger.info("Latest date: %(latest_date)s (%(latest_count)s records)", stats)
    logger.info("Signal counts: %(signal_counts)s", stats)
    logger.info("DBOT token configured: %(token_configured)s", stats)
    logger.info("=" * 50)

    if stats["total_records"] == 0:
        logger.error("Database is empty")
        return 1

    if not stats["token_configured"]:
        logger.warning("No DBOT token configured — ETL will fail")

    logger.info("Overview validation passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
