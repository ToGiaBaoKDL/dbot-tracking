#!/usr/bin/env python3
"""Create admin user from CLI."""

import argparse
import asyncio
import sys

sys.path.insert(0, "/app")

from app.core.database import _get_session_maker
from app.core.security import get_password_hash
from app.repositories.user_repo import UserRepository


def _validate_username(username: str) -> None:
    normalized = username.strip().lower()
    if len(normalized) < 3 or len(normalized) > 50:
        print("[ERROR] Username must be between 3 and 50 characters")
        sys.exit(1)
    if not normalized.replace("_", "").replace("-", "").isalnum():
        print("[ERROR] Username must be alphanumeric (underscores and hyphens allowed)")
        sys.exit(1)


def _validate_password(password: str) -> None:
    if len(password) < 6:
        print("[ERROR] Password must be at least 6 characters long")
        sys.exit(1)


async def create_admin(username: str, password: str) -> None:
    _validate_username(username)
    _validate_password(password)

    session_maker = _get_session_maker()
    async with session_maker() as session:
        repo = UserRepository(session)
        existing = await repo.get_by_username(username)
        if existing:
            print(f"[WARNING] User '{username}' already exists (id={existing.id})")
            sys.exit(0)

        user = await repo.create(
            username=username,
            hashed_password=get_password_hash(password),
            is_admin=True,
        )
        await session.commit()
        print(f"[INFO] Admin user '{username}' created (id={user.id})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Create admin user")
    parser.add_argument("--username", default="admin", help="Admin username")
    parser.add_argument("--password", default="admin123", help="Admin password (min 6 chars)")
    args = parser.parse_args()

    asyncio.run(create_admin(args.username, args.password))
