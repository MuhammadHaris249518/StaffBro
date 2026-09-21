import uuid

from sqlalchemy import exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import Availability, EmploymentType, UsageEventKind
from app.core.http import forbidden, not_found
from app.core.pagination import Page
from app.modules.auth.models import User, UserRole
from app.modules.catalog.models import Location, Profession, Skill
from app.modules.reports.service import track
from app.modules.workers.models import WorkerProfile, WorkerSkill
from app.modules.workers.schemas import SkillRef, WorkerCardOut, WorkerProfileOut, WorkerProfileUpdateIn


def _completeness(profile: WorkerProfile, skill_count: int) -> int:
    filled = 0
    total = 8
    if profile.profession_id:
        filled += 1
    if profile.location_id:
        filled += 1
    if profile.experience_years is not None:
        filled += 1
    if profile.expected_salary is not None:
        filled += 1
    if profile.availability:
        filled += 1
    if profile.employment_type:
        filled += 1
    if profile.bio:
        filled += 1
    if skill_count:
        filled += 1
    return round(filled / total * 100)


async def _skills_for(db: AsyncSession, profile_id: uuid.UUID) -> list[SkillRef]:
    rows = list(
        (
            await db.execute(
                select(Skill)
                .join(WorkerSkill, WorkerSkill.skill_id == Skill.id)
                .where(WorkerSkill.worker_profile_id == profile_id)
                .order_by(Skill.name_en)
            )
        ).scalars().all()
    )
    return [SkillRef(id=s.id, name_en=s.name_en, name_ur=s.name_ur, slug=s.slug) for s in rows]


async def _names(
    db: AsyncSession, profession_id: uuid.UUID | None, location_id: uuid.UUID | None
) -> tuple[str | None, str | None, str | None]:
    prof_en = prof_ur = loc = None
    if profession_id:
        p = (await db.execute(select(Profession).where(Profession.id == profession_id))).scalar_one_or_none()
        if p:
            prof_en, prof_ur = p.name_en, p.name_ur
    if location_id:
        l = (await db.execute(select(Location).where(Location.id == location_id))).scalar_one_or_none()
        if l:
            loc = f"{l.name_en} ({l.name_ur})"
    return prof_en, prof_ur, loc


def _card(
    user: User,
    profile: WorkerProfile | None,
    skills: list[SkillRef],
    prof_en: str | None,
    prof_ur: str | None,
    loc: str | None,
) -> WorkerCardOut:
    p = profile
    return WorkerCardOut(
        id=user.id,
        full_name=user.full_name,
        headline=p.headline if p else None,
        profession_id=p.profession_id if p else None,
        profession_name_en=prof_en,
        profession_name_ur=prof_ur,
        location_label=loc,
        experience_years=p.experience_years if p else None,
        expected_salary=p.expected_salary if p else None,
        availability=(p.availability.value if p else Availability.AVAILABLE.value),
        employment_type=p.employment_type.value if p and p.employment_type else None,
        phone_verified=user.phone_verified_at is not None,
        skills=skills,
    )


async def _ensure_profile(db: AsyncSession, user: User) -> WorkerProfile:
    row = (await db.execute(select(WorkerProfile).where(WorkerProfile.user_id == user.id))).scalar_one_or_none()
    if row is None:
        row = WorkerProfile(user_id=user.id)
        db.add(row)
        await db.flush()
    return row


async def get_mine(db: AsyncSession, user: User) -> WorkerProfileOut:
    profile = await _ensure_profile(db, user)
    skills = await _skills_for(db, profile.id)
    prof_en, prof_ur, loc = await _names(db, profile.profession_id, profile.location_id)
    return WorkerProfileOut(
        id=user.id,
        full_name=user.full_name,
        phone=user.phone,
        phone_verified=user.phone_verified_at is not None,
        headline=profile.headline,
        bio=profile.bio,
        profession_id=profile.profession_id,
        profession_name_en=prof_en,
        profession_name_ur=prof_ur,
        location_id=profile.location_id,
        location_label=loc,
        experience_years=profile.experience_years,
        expected_salary=profile.expected_salary,
        availability=profile.availability.value,
        employment_type=profile.employment_type.value if profile.employment_type else None,
        skills=skills,
        completeness=_completeness(profile, len(skills)),
        created_at=profile.created_at,
    )


async def update_mine(db: AsyncSession, user: User, body: WorkerProfileUpdateIn) -> WorkerProfileOut:
    profile = await _ensure_profile(db, user)
    data = body.model_dump(exclude_unset=True)
    skill_ids = data.pop("skill_ids", None)
    full_name = data.pop("full_name", None)
    if full_name:
        user.full_name = full_name.strip()
    if "profession_id" in data and data["profession_id"] is not None:
        p = (await db.execute(select(Profession).where(Profession.id == data["profession_id"]))).scalar_one_or_none()
        if p is None:
            not_found("Profession not found.")
        if not data.get("headline"):
            profile.headline = p.name_en
    if "location_id" in data and data["location_id"] is not None:
        loc = (await db.execute(select(Location).where(Location.id == data["location_id"]))).scalar_one_or_none()
        if loc is None:
            not_found("Location not found.")
    for key, value in data.items():
        setattr(profile, key, value)
    if skill_ids is not None:
        existing = list(
            (await db.execute(select(WorkerSkill).where(WorkerSkill.worker_profile_id == profile.id))).scalars().all()
        )
        for row in existing:
            await db.delete(row)
        if skill_ids:
            skills = list((await db.execute(select(Skill).where(Skill.id.in_(skill_ids)))).scalars().all())
            if len(skills) != len(set(skill_ids)):
                not_found("One or more skills were not found.")
            for skill in skills:
                db.add(WorkerSkill(worker_profile_id=profile.id, skill_id=skill.id))
    await db.commit()
    return await get_mine(db, user)


async def get_preview(db: AsyncSession, viewer: User, worker_id: uuid.UUID) -> WorkerProfileOut:
    row = (
        await db.execute(
            select(User, WorkerProfile)
            .outerjoin(WorkerProfile, WorkerProfile.user_id == User.id)
            .where(User.id == worker_id, User.role == UserRole.WORKER, User.is_suspended.is_(False))
        )
    ).one_or_none()
    if row is None:
        not_found("Job seeker not found.")
    user, profile = row
    if profile is None:
        profile = WorkerProfile(user_id=user.id, availability=Availability.AVAILABLE)
    skills = await _skills_for(db, profile.id) if profile.id else []
    prof_en, prof_ur, loc = await _names(db, profile.profession_id, profile.location_id)
    if viewer.role == UserRole.BUSINESS:
        await track(
            db,
            kind=UsageEventKind.PROFILE_VIEW,
            actor_user_id=viewer.id,
            entity_type="worker",
            entity_id=user.id,
        )
        await db.commit()
    show_phone = viewer.id == user.id or viewer.role == UserRole.ADMIN
    return WorkerProfileOut(
        id=user.id,
        full_name=user.full_name,
        phone=user.phone if show_phone else None,
        phone_verified=user.phone_verified_at is not None,
        headline=profile.headline,
        bio=profile.bio,
        profession_id=profile.profession_id,
        profession_name_en=prof_en,
        profession_name_ur=prof_ur,
        location_id=profile.location_id,
        location_label=loc,
        experience_years=profile.experience_years,
        expected_salary=profile.expected_salary,
        availability=profile.availability.value,
        employment_type=profile.employment_type.value if profile.employment_type else None,
        skills=skills,
        completeness=_completeness(profile, len(skills)),
        created_at=profile.created_at,
    )


async def list_seekers(
    db: AsyncSession,
    *,
    viewer: User,
    limit: int,
    cursor: str | None,
    q: str | None = None,
    profession_id: uuid.UUID | None = None,
    skill_id: uuid.UUID | None = None,
    location_id: uuid.UUID | None = None,
    employment_type: EmploymentType | None = None,
    availability: Availability | None = Availability.AVAILABLE,
    salary_min: int | None = None,
    salary_max: int | None = None,
    experience_min: int | None = None,
) -> Page[WorkerCardOut]:
    if viewer.role != UserRole.BUSINESS and viewer.role != UserRole.ADMIN:
        forbidden("Only companies can browse job seekers.")
    stmt = (
        select(User, WorkerProfile)
        .outerjoin(WorkerProfile, WorkerProfile.user_id == User.id)
        .where(User.role == UserRole.WORKER, User.is_suspended.is_(False))
    )
    if availability is not None:
        stmt = stmt.where(WorkerProfile.availability == availability)
    if profession_id:
        stmt = stmt.where(WorkerProfile.profession_id == profession_id)
    if location_id:
        stmt = stmt.where(WorkerProfile.location_id == location_id)
    if employment_type:
        stmt = stmt.where(WorkerProfile.employment_type == employment_type)
    if salary_min is not None:
        stmt = stmt.where(WorkerProfile.expected_salary >= salary_min)
    if salary_max is not None:
        stmt = stmt.where(WorkerProfile.expected_salary <= salary_max)
    if experience_min is not None:
        stmt = stmt.where(WorkerProfile.experience_years >= experience_min)
    if skill_id:
        stmt = stmt.where(
            exists(
                select(WorkerSkill.id).where(
                    WorkerSkill.worker_profile_id == WorkerProfile.id, WorkerSkill.skill_id == skill_id
                )
            )
        )
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.outerjoin(Profession, Profession.id == WorkerProfile.profession_id)
        stmt = stmt.outerjoin(Location, Location.id == WorkerProfile.location_id)
        stmt = stmt.where(
            or_(
                User.full_name.ilike(like),
                WorkerProfile.headline.ilike(like),
                WorkerProfile.bio.ilike(like),
                Profession.name_en.ilike(like),
                Profession.name_ur.ilike(like),
                Location.name_en.ilike(like),
                Location.name_ur.ilike(like),
            )
        )
    if cursor:
        stmt = stmt.where(User.id > uuid.UUID(cursor))
    stmt = stmt.order_by(User.id).limit(limit + 1)
    rows = list((await db.execute(stmt)).all())
    next_cursor = str(rows[-1][0].id) if len(rows) > limit else None
    items: list[WorkerCardOut] = []
    for user, profile in rows[:limit]:
        skills = await _skills_for(db, profile.id) if profile else []
        prof_en, prof_ur, loc = await _names(
            db, profile.profession_id if profile else None, profile.location_id if profile else None
        )
        items.append(_card(user, profile, skills, prof_en, prof_ur, loc))
    return Page(items=items, next_cursor=next_cursor)
