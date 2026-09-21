import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import NotificationKind
from app.core.http import not_found
from app.modules.notifications.models import Notification
from app.modules.notifications.schemas import NotificationOut, NotificationPage


async def notify(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    kind: NotificationKind,
    title: str,
    body: str,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    flush: bool = False,
) -> None:
    db.add(
        Notification(
            user_id=user_id,
            kind=kind,
            title=title[:160],
            body=body[:400],
            entity_type=entity_type,
            entity_id=entity_id,
        )
    )
    if flush:
        await db.flush()


async def list_mine(db: AsyncSession, user_id: uuid.UUID, limit: int, cursor: str | None) -> NotificationPage:
    stmt = select(Notification).where(Notification.user_id == user_id)
    if cursor:
        stmt = stmt.where(Notification.id < uuid.UUID(cursor))
    stmt = stmt.order_by(Notification.created_at.desc(), Notification.id.desc()).limit(limit + 1)
    rows = list((await db.execute(stmt)).scalars().all())
    unread = (
        await db.execute(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == user_id, Notification.is_read.is_(False)
            )
        )
    ).scalar_one()
    next_cursor = str(rows[-1].id) if len(rows) > limit else None
    return NotificationPage(
        items=[NotificationOut.model_validate(row) for row in rows[:limit]],
        next_cursor=next_cursor,
        unread_count=int(unread),
    )


async def mark_read(db: AsyncSession, user_id: uuid.UUID, notification_id: uuid.UUID) -> NotificationOut:
    row = (
        await db.execute(
            select(Notification).where(Notification.id == notification_id, Notification.user_id == user_id)
        )
    ).scalar_one_or_none()
    if row is None:
        not_found("Notification not found.")
    row.is_read = True
    row.read_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(row)
    return NotificationOut.model_validate(row)


async def mark_all_read(db: AsyncSession, user_id: uuid.UUID) -> dict:
    rows = list(
        (
            await db.execute(
                select(Notification).where(Notification.user_id == user_id, Notification.is_read.is_(False))
            )
        ).scalars().all()
    )
    now = datetime.now(UTC)
    for row in rows:
        row.is_read = True
        row.read_at = now
    await db.commit()
    return {"marked": len(rows)}
