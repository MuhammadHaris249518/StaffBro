from datetime import UTC, datetime
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import NotificationKind


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: NotificationKind
    title: str
    body: str
    entity_type: str | None = None
    entity_id: uuid.UUID | None = None
    is_read: bool
    created_at: datetime


class NotificationPage(BaseModel):
    items: list[NotificationOut]
    next_cursor: str | None = None
    unread_count: int = 0
