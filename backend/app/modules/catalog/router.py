import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.modules.catalog.schemas import LocationOut, LocationPage, ProfessionOut, ProfessionPage, SkillOut, SkillPage
from app.modules.catalog.service import list_locations, list_professions, list_skills

router = APIRouter(prefix="/catalog", tags=["Catalogue"])


@router.get("/professions", response_model=ProfessionPage)
async def get_professions(
    limit: int = Query(default=100, ge=1, le=200),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> ProfessionPage:
    rows, next_cursor = await list_professions(db, limit, cursor)
    return ProfessionPage(items=[ProfessionOut.model_validate(r) for r in rows], next_cursor=next_cursor)


@router.get("/skills", response_model=SkillPage)
async def get_skills(
    limit: int = Query(default=100, ge=1, le=200),
    cursor: str | None = None,
    profession_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
) -> SkillPage:
    rows, next_cursor = await list_skills(db, limit, cursor, profession_id)
    return SkillPage(items=[SkillOut.model_validate(r) for r in rows], next_cursor=next_cursor)


@router.get("/locations", response_model=LocationPage)
async def get_locations(
    limit: int = Query(default=200, ge=1, le=500),
    cursor: str | None = None,
    parent_id: uuid.UUID | None = None,
    level: str | None = Query(default=None, pattern="^(COUNTRY|PROVINCE|CITY|AREA)$"),
    db: AsyncSession = Depends(get_db),
) -> LocationPage:
    rows, next_cursor = await list_locations(db, limit, cursor, parent_id, level)
    return LocationPage(items=[LocationOut.model_validate(r) for r in rows], next_cursor=next_cursor)
