#!/usr/bin/env python3
"""Safe generic table query — inspect any table with row limit."""

import argparse
import logging
import os
import sys

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

sys.path.insert(0, "/app")

from app.core.db_url import to_sync_url

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("dbot-query")

# Whitelist of queryable tables to prevent accidental data leakage
_SAFE_TABLES = frozenset({
    "stocks",
    "stock_daily_data",
    "users",
    "dbot_token",
})


def _get_engine() -> Engine:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL environment variable is not set")
    return create_engine(to_sync_url(url), future=True, pool_pre_ping=True)


def _validate_table(table: str) -> None:
    if table not in _SAFE_TABLES:
        logger.error("[ERROR] Table '%s' is not in the query whitelist.", table)
        logger.error("Allowed tables: %s", ", ".join(sorted(_SAFE_TABLES)))
        sys.exit(1)


def _validate_limit(limit: int) -> None:
    if limit < 1 or limit > 10000:
        logger.error("[ERROR] Limit must be between 1 and 10000")
        sys.exit(1)


def query_table(table: str, limit: int) -> None:
    _validate_table(table)
    _validate_limit(limit)

    engine = _get_engine()
    # Use SQLAlchemy text() with bound params to prevent injection
    sql = text("SELECT * FROM \"" + table + "\" LIMIT :limit")
    # Note: table name is whitelisted, not user-input directly into query.
    # :limit is a bound parameter (safe from SQL injection).

    with engine.connect() as conn:
        result = conn.execute(sql, {"limit": limit})
        rows = result.fetchall()
        columns = list(result.keys())

    if not rows:
        logger.info("No rows found in table '%s'", table)
        return

    # Print header
    header = " | ".join(str(c) for c in columns)
    logger.info(header)
    logger.info("-" * len(header))

    # Print rows (truncate very long values)
    for row in rows:
        values = []
        for val in row:
            s = str(val) if val is not None else "NULL"
            if len(s) > 100:
                s = s[:97] + "..."
            values.append(s)
        logger.info(" | ".join(values))

    logger.info("Total rows: %d (limited to %d)", len(rows), limit)


def main() -> int:
    parser = argparse.ArgumentParser(description="Query any table (safe, whitelisted)")
    parser.add_argument("table", help="Table name")
    parser.add_argument("-n", "--limit", type=int, default=10, help="Max rows (1-10000)")
    args = parser.parse_args()

    query_table(args.table, args.limit)
    return 0


if __name__ == "__main__":
    sys.exit(main())
