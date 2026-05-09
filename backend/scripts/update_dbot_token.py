#!/usr/bin/env python3
"""Update DBOT Bearer token from CLI."""

import argparse
import asyncio
import sys
from datetime import date, datetime, timezone

sys.path.insert(0, "/app")

from app.core.database import _get_session_maker
from app.repositories.token_repo import TokenRepository


def _validate_token(token: str) -> None:
    if len(token.strip()) < 10:
        print("[ERROR] Token must be at least 10 characters long")
        sys.exit(1)


def _parse_expires_at(expires_at: str | None) -> datetime | None:
    if not expires_at:
        return None
    try:
        # Accept ISO date (YYYY-MM-DD) or ISO datetime
        if "T" in expires_at or " " in expires_at:
            dt = datetime.fromisoformat(expires_at.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        # Date only: end-of-day UTC
        d = date.fromisoformat(expires_at)
        return datetime.combine(d, datetime.max.time()).replace(tzinfo=timezone.utc)
    except ValueError:
        print("[ERROR] Invalid expires_at format. Use YYYY-MM-DD or ISO datetime")
        sys.exit(1)


async def update_token(token: str, expires_at: str | None = None) -> None:
    _validate_token(token)
    expires_dt = _parse_expires_at(expires_at)

    session_maker = _get_session_maker()
    async with session_maker() as session:
        repo = TokenRepository(session)
        await repo.upsert(token=token, expires_at=expires_dt)
        await session.commit()
        print("[INFO] DBOT token updated successfully")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update DBOT Bearer token")
    parser.add_argument("token", help="Bearer token string")
    parser.add_argument("--expires-at", help="Expiration datetime (ISO format)")
    args = parser.parse_args()

    asyncio.run(update_token(args.token, args.expires_at))
