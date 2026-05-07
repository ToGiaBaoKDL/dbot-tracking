from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.models import DbotToken


class DbotTokenRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_current(self) -> DbotToken | None:
        result = await self.session.execute(
            select(DbotToken).order_by(DbotToken.updated_at.desc()).limit(1)
        )
        return result.scalar_one_or_none()

    async def create_or_update(self, token: str, expires_at: datetime | None = None) -> DbotToken:
        existing = await self.get_current()
        if existing:
            existing.token = token
            existing.expires_at = expires_at
            await self.session.flush()
            await self.session.refresh(existing)
            return existing
        new_token = DbotToken(token=token, expires_at=expires_at)
        self.session.add(new_token)
        await self.session.flush()
        await self.session.refresh(new_token)
        return new_token
