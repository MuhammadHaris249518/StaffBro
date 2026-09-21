import uuid

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.catalog.models import Location, Profession, Skill


def _after_id(stmt: Select, model, cursor: str | None) -> Select:
    if cursor:
        stmt = stmt.where(model.id > uuid.UUID(cursor))
    return stmt.order_by(model.id)


async def list_professions(db: AsyncSession, limit: int, cursor: str | None) -> tuple[list[Profession], str | None]:
    stmt = _after_id(select(Profession).where(Profession.is_active.is_(True)), Profession, cursor).limit(limit + 1)
    rows = list((await db.execute(stmt)).scalars().all())
    next_cursor = str(rows[-1].id) if len(rows) > limit else None
    return rows[:limit], next_cursor


async def list_skills(
    db: AsyncSession, limit: int, cursor: str | None, profession_id: uuid.UUID | None
) -> tuple[list[Skill], str | None]:
    stmt = select(Skill).where(Skill.is_active.is_(True))
    if profession_id:
        stmt = stmt.where((Skill.profession_id == profession_id) | (Skill.profession_id.is_(None)))
    stmt = _after_id(stmt, Skill, cursor).limit(limit + 1)
    rows = list((await db.execute(stmt)).scalars().all())
    next_cursor = str(rows[-1].id) if len(rows) > limit else None
    return rows[:limit], next_cursor


async def list_locations(
    db: AsyncSession, limit: int, cursor: str | None, parent_id: uuid.UUID | None, level: str | None
) -> tuple[list[Location], str | None]:
    stmt = select(Location).where(Location.is_active.is_(True))
    if parent_id:
        stmt = stmt.where(Location.parent_id == parent_id)
    if level:
        stmt = stmt.where(Location.level == level)
    stmt = _after_id(stmt, Location, cursor).limit(limit + 1)
    rows = list((await db.execute(stmt)).scalars().all())
    next_cursor = str(rows[-1].id) if len(rows) > limit else None
    return rows[:limit], next_cursor
