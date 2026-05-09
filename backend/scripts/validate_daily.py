#!/usr/bin/env python3
"""Validate daily data has been loaded into the database."""

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


def validate(target_date: date) -> dict:
    engine = _get_engine()
    with engine.connect() as conn:
        # Total records for the date
        total = conn.execute(
            text("SELECT COUNT(*) FROM stock_daily_data WHERE record_date = :d"),
            {"d": target_date},
        ).scalar()

        # Signal breakdown
        buy = conn.execute(
            text("SELECT COUNT(*) FROM stock_daily_data WHERE record_date = :d AND signal = 'BUY'"),
            {"d": target_date},
        ).scalar()
        sell = conn.execute(
            text(
                "SELECT COUNT(*) FROM stock_daily_data WHERE record_date = :d AND signal = 'SELL'"
            ),
            {"d": target_date},
        ).scalar()
        no_signal = conn.execute(
            text("SELECT COUNT(*) FROM stock_daily_data WHERE record_date = :d AND signal IS NULL"),
            {"d": target_date},
        ).scalar()

        # Unique symbols
        symbols = conn.execute(
            text("SELECT COUNT(DISTINCT symbol) FROM stock_daily_data WHERE record_date = :d"),
            {"d": target_date},
        ).scalar()

    return {
        "date": target_date.isoformat(),
        "total_records": total,
        "buy_signals": buy,
        "sell_signals": sell,
        "no_signal": no_signal,
        "unique_symbols": symbols,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate daily DBOT data")
    parser.add_argument(
        "--date",
        type=date.fromisoformat,
        default=date.today(),
        help="Date to validate (YYYY-MM-DD). Defaults to today.",
    )
    args = parser.parse_args()

    logger.info("Validating data for %s", args.date)
    stats = validate(args.date)

    logger.info("Total records: %(total_records)s", stats)
    logger.info("BUY signals: %(buy_signals)s", stats)
    logger.info("SELL signals: %(sell_signals)s", stats)
    logger.info("No signal: %(no_signal)s", stats)
    logger.info("Unique symbols: %(unique_symbols)s", stats)

    if stats["total_records"] == 0:
        logger.warning("No data found for %s — market may be closed", args.date)
        return 0

    if stats["buy_signals"] == 0 and stats["sell_signals"] == 0:
        logger.warning("No BUY/SELL signals for %s — data may be incomplete", args.date)
        return 0

    logger.info("Validation passed for %s", args.date)
    return 0


if __name__ == "__main__":
    sys.exit(main())
