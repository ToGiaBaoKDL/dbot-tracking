"""Database URL utilities shared across async and sync contexts."""


def to_sync_url(async_url: str) -> str:
    """Convert asyncpg URL to psycopg2 sync URL."""
    return async_url.replace("+asyncpg", "+psycopg2")
