#!/usr/bin/env python3
"""Update DBOT Bearer token from CLI."""

import argparse
import asyncio
import sys

sys.path.insert(0, "/app")

from app.core.database import _get_session_maker
from app.repositories.token_repo import DbotTokenRepository


def _validate_token(token: str) -> None:
    if len(token.strip()) < 10:
        print("[ERROR] Token must be at least 10 characters long")
        sys.exit(1)


async def update_token(token: str) -> None:
    _validate_token(token)

    session_maker = _get_session_maker()
    async with session_maker() as session:
        repo = DbotTokenRepository(session)
        await repo.create_or_update(token=token)
        await session.commit()
        print("[INFO] DBOT token updated successfully")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update DBOT Bearer token")
    parser.add_argument("token", help="Bearer token string")
    args = parser.parse_args()

    asyncio.run(update_token(args.token))
