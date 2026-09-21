from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user, require_role


async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_db():
        yield session


__all__ = ["db_session", "get_current_user", "require_role"]
