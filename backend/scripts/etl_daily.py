#!/usr/bin/env python3
"""Daily ETL script to fetch DBOT stock data after market close."""

import logging

from app.etl.client import DbotClient, transform_dbot_record
from app.etl.database import get_dbot_token, save_daily_records

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("dbot-etl")


def run_daily_etl() -> dict:
    token = get_dbot_token()
    logger.info("Starting daily ETL")

    with DbotClient(token) as client:
        daily_data = client.get_daily_all()

    records = [r for r in (transform_dbot_record(raw) for raw in daily_data) if r is not None]
    save_daily_records(records)

    buy_count = sum(1 for r in records if r.get("signal") == "BUY")
    sell_count = sum(1 for r in records if r.get("signal") == "SELL")

    logger.info("Daily ETL completed: %s records", len(records))
    logger.info("BUY signals: %s, SELL signals: %s", buy_count, sell_count)

    return {
        "total_records": len(records),
        "buy_signals": buy_count,
        "sell_signals": sell_count,
    }


if __name__ == "__main__":
    run_daily_etl()
