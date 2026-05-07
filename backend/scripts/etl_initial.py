#!/usr/bin/env python3
"""Initial historical data dump script from DBOT."""

import logging

from app.etl.client import DbotClient, filter_index_symbols, transform_dbot_record
from app.etl.database import get_dbot_token, save_daily_records, save_symbols

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("dbot-etl")


def run_initial_dump() -> dict:
    token = get_dbot_token()
    logger.info("Starting initial dump")

    with DbotClient(token) as client:
        symbols = client.get_all_symbols()
        stock_symbols = filter_index_symbols(symbols)
        save_symbols(stock_symbols)
        logger.info("Saved %s symbols", len(stock_symbols))

    all_records = []
    failed_symbols = []
    batch_size = 20
    total = len(stock_symbols)

    with DbotClient(token, timeout=120.0) as client:
        for i in range(0, total, batch_size):
            batch = stock_symbols[i : i + batch_size]
            for symbol in batch:
                try:
                    history = client.get_history_single(symbol)
                    for raw in history:
                        rec = transform_dbot_record(raw)
                        if rec:
                            all_records.append(rec)
                except Exception:
                    failed_symbols.append(symbol)
                    logger.exception("Error fetching %s", symbol)
            logger.info("Processed %s/%s symbols", min(i + batch_size, total), total)

    if len(failed_symbols) == total:
        raise RuntimeError(f"All {total} symbols failed to fetch")

    save_daily_records(all_records)
    logger.info(
        "Saved %s total records (%s symbols failed)",
        len(all_records),
        len(failed_symbols),
    )

    return {
        "total_records": len(all_records),
        "symbols_processed": total - len(failed_symbols),
        "symbols_failed": len(failed_symbols),
    }


if __name__ == "__main__":
    run_initial_dump()
