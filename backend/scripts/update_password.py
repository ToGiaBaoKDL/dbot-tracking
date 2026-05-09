#!/usr/bin/env python3
"""Update user password from CLI."""

import argparse
import asyncio
import sys

sys.path.insert(0, "/app")

from app.core.database import _get_session_maker
from app.core.security import get_password_hash
from app.repositories.user_repo import UserRepository


def _validate_password(password: str) -> None:
    if len(password) < 6:
        print("[ERROR] Password must be at least 6 characters long")
        sys.exit(1)


async def update_password(username: str, password: str) -> None:
    _validate_password(password)

    session_maker = _get_session_maker()
    async with session_maker() as session:
        repo = UserRepository(session)
        user = await repo.get_by_username(username)
        if not user:
            print(f"[ERROR] User '{username}' not found")
            sys.exit(1)

        user.hashed_password = get_password_hash(password)
        await repo.update(user)
        await session.commit()
        print(f"[INFO] Password updated for user '{username}' (id={user.id})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update user password")
    parser.add_argument("--username", required=True, help="Username")
    parser.add_argument("--password", required=True, help="New password (min 6 chars)")
    args = parser.parse_args()

    asyncio.run(update_password(args.username, args.password))
