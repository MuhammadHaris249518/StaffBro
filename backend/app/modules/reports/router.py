from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.enums import UsageEventKind
from app.core.security import get_current_user
from app.modules.auth.models import User
from app.modules.reports.schemas import TrackEventIn
from app.modules.reports.service import track

router = APIRouter()


@router.post("/events")
async def track_event(
    body: TrackEventIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.kind not in {UsageEventKind.CONTACT, UsageEventKind.PROFILE_VIEW}:
        return {"ok": True}
    await track(
        db,
        kind=body.kind,
        actor_user_id=user.id,
        entity_type=body.entity_type,
        entity_id=body.entity_id,
    )
    await db.commit()
    return {"ok": True}
