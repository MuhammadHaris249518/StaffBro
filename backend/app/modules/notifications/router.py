from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.modules.auth.models import User
from app.modules.notifications.schemas import NotificationOut, NotificationPage
from app.modules.notifications.service import list_mine, mark_all_read, mark_read

router = APIRouter()


@router.get("", response_model=NotificationPage)
async def list_notifications(
    limit: int = Query(default=50, ge=1, le=100),
    cursor: str | None = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationPage:
    return await list_mine(db, user.id, limit, cursor)


@router.post("/read-all")
async def read_all_route(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> dict:
    return await mark_all_read(db, user.id)


@router.post("/{notification_id}/read", response_model=NotificationOut)
async def read_one_route(
    notification_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> NotificationOut:
    from uuid import UUID

    return await mark_read(db, user.id, UUID(notification_id))
