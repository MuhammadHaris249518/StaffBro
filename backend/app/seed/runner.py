import asyncio
import uuid

from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import SessionLocal
from app.core.enums import Availability, BusinessType, EmploymentType
from app.core.security import hash_password
from app.modules.auth.models import User, UserRole
from app.modules.businesses.models import Business, BusinessStatus
from app.modules.catalog.models import Location, LocationLevel, Profession, Skill
from app.modules.jobs.models import Job, JobSkill, JobStatus
from app.modules.workers.models import WorkerProfile, WorkerSkill
from app.seed.catalog_data import ISLAMABAD_AREAS, PROFESSIONS, RAWALPINDI_AREAS, SKILLS
from app.utils.phone import normalize_pk_phone


async def _get_or_create_location(
    db: AsyncSession,
    *,
    slug: str,
    name_en: str,
    name_ur: str,
    level: LocationLevel,
    parent_id: uuid.UUID | None,
) -> Location:
    stmt = select(Location).where(Location.slug == slug)
    stmt = stmt.where(Location.parent_id.is_(None) if parent_id is None else Location.parent_id == parent_id)
    row = (await db.execute(stmt)).scalar_one_or_none()
    if row:
        row.name_en = name_en
        row.name_ur = name_ur
        row.level = level
        row.is_active = True
        return row
    row = Location(slug=slug, name_en=name_en, name_ur=name_ur, level=level, parent_id=parent_id, is_active=True)
    db.add(row)
    await db.flush()
    return row


async def seed(db: AsyncSession) -> dict[str, int]:
    pakistan = await _get_or_create_location(
        db, slug="pakistan", name_en="Pakistan", name_ur="پاکستان", level=LocationLevel.COUNTRY, parent_id=None
    )
    ict = await _get_or_create_location(
        db,
        slug="islamabad-capital-territory",
        name_en="Islamabad Capital Territory",
        name_ur="وفاقی دارالحکومت",
        level=LocationLevel.PROVINCE,
        parent_id=pakistan.id,
    )
    punjab = await _get_or_create_location(
        db, slug="punjab", name_en="Punjab", name_ur="پنجاب", level=LocationLevel.PROVINCE, parent_id=pakistan.id
    )
    islamabad = await _get_or_create_location(
        db, slug="islamabad", name_en="Islamabad", name_ur="اسلام آباد", level=LocationLevel.CITY, parent_id=ict.id
    )
    rawalpindi = await _get_or_create_location(
        db, slug="rawalpindi", name_en="Rawalpindi", name_ur="راولپنڈی", level=LocationLevel.CITY, parent_id=punjab.id
    )

    area_count = 0
    for slug, name_en, name_ur in ISLAMABAD_AREAS:
        await _get_or_create_location(
            db, slug=slug, name_en=name_en, name_ur=name_ur, level=LocationLevel.AREA, parent_id=islamabad.id
        )
        area_count += 1
    for slug, name_en, name_ur in RAWALPINDI_AREAS:
        await _get_or_create_location(
            db, slug=slug, name_en=name_en, name_ur=name_ur, level=LocationLevel.AREA, parent_id=rawalpindi.id
        )
        area_count += 1

    profession_ids: dict[str, uuid.UUID] = {}
    for slug, name_en, name_ur, aliases in PROFESSIONS:
        row = (await db.execute(select(Profession).where(Profession.slug == slug))).scalar_one_or_none()
        if row:
            row.name_en = name_en
            row.name_ur = name_ur
            row.aliases = aliases
            row.is_active = True
        else:
            row = Profession(slug=slug, name_en=name_en, name_ur=name_ur, aliases=aliases, is_active=True)
            db.add(row)
            await db.flush()
        profession_ids[slug] = row.id

    skill_count = 0
    for slug, profession_slug, name_en, name_ur, aliases in SKILLS:
        profession_id = profession_ids.get(profession_slug) if profession_slug else None
        row = (await db.execute(select(Skill).where(Skill.slug == slug))).scalar_one_or_none()
        if row:
            row.name_en = name_en
            row.name_ur = name_ur
            row.aliases = aliases
            row.profession_id = profession_id
            row.is_active = True
        else:
            db.add(
                Skill(
                    slug=slug,
                    name_en=name_en,
                    name_ur=name_ur,
                    aliases=aliases,
                    profession_id=profession_id,
                    is_active=True,
                )
            )
        skill_count += 1

    demo = await _seed_demo(db, profession_ids)
    await db.commit()
    return {"professions": len(PROFESSIONS), "skills": skill_count, "areas": area_count, **demo}


async def _get_or_create_user(
    db: AsyncSession, *, phone: str, full_name: str, role: UserRole, password: str
) -> User:
    e164 = normalize_pk_phone(phone)
    row = (await db.execute(select(User).where(User.phone == e164))).scalar_one_or_none()
    if row:
        return row
    row = User(
        phone=e164,
        password_hash=hash_password(password),
        role=role,
        full_name=full_name,
        tos_accepted_at=datetime.now(UTC),
        phone_verified_at=datetime.now(UTC),
        last_active_at=datetime.now(UTC),
    )
    db.add(row)
    await db.flush()
    return row


async def _location_by_slug(db: AsyncSession, slug: str) -> Location | None:
    return (await db.execute(select(Location).where(Location.slug == slug))).scalar_one_or_none()


async def _skill_by_slug(db: AsyncSession, slug: str) -> Skill | None:
    return (await db.execute(select(Skill).where(Skill.slug == slug))).scalar_one_or_none()


async def _seed_demo(db: AsyncSession, profession_ids: dict[str, uuid.UUID]) -> dict[str, int]:
    await _get_or_create_user(
        db, phone="03009999999", full_name="Staffbro Admin", role=UserRole.ADMIN, password="password8"
    )
    worker = await _get_or_create_user(
        db, phone="03001234567", full_name="Muhammad Usman", role=UserRole.WORKER, password="password8"
    )
    f10 = await _location_by_slug(db, "f-10-markaz")
    blue = await _location_by_slug(db, "blue-area")
    profile = (await db.execute(select(WorkerProfile).where(WorkerProfile.user_id == worker.id))).scalar_one_or_none()
    if profile is None:
        profile = WorkerProfile(user_id=worker.id)
        db.add(profile)
        await db.flush()
    profile.headline = "Head Chef / Karahi Specialist"
    profile.bio = "8 saal ka tandoor aur karahi experience. Islamabad hotels aur restaurants."
    profile.profession_id = profession_ids.get("cook")
    profile.location_id = f10.id if f10 else None
    profile.experience_years = 8
    profile.expected_salary = 50000
    profile.availability = Availability.AVAILABLE
    profile.employment_type = EmploymentType.FULL_TIME
    existing_skills = (await db.execute(select(WorkerSkill).where(WorkerSkill.worker_profile_id == profile.id))).scalars().all()
    if not existing_skills:
        for slug in ("shinwari-karahi", "koyla-bbq", "tandoor"):
            skill = await _skill_by_slug(db, slug)
            if skill:
                db.add(WorkerSkill(worker_profile_id=profile.id, skill_id=skill.id))
    manager = await _get_or_create_user(
        db,
        phone="03007654321",
        full_name="Haji Shaukat",
        role=UserRole.BUSINESS,
        password="password8",
    )
    biz = (await db.execute(select(Business).where(Business.owner_user_id == manager.id))).scalar_one_or_none()
    if biz is None:
        biz = Business(owner_user_id=manager.id, name="Khyber Shinwari Restaurant", status=BusinessStatus.ACTIVE)
        db.add(biz)
        await db.flush()
    biz.status = BusinessStatus.ACTIVE
    biz.business_type = BusinessType.RESTAURANT
    biz.location_id = f10.id if f10 else None
    biz.location_label = "F-10 Markaz, Islamabad"
    biz.description = "Family restaurant serving Shinwari karahi, BBQ, and naan."
    existing_jobs = (await db.execute(select(Job).where(Job.business_id == biz.id))).scalars().all()
    if not existing_jobs:
        cook = Job(
            business_id=biz.id,
            title="Head Chef / Cook",
            description="Desi & Chinese specialist. 3+ years. Meals and accommodation provided.",
            salary_min=45000,
            salary_max=55000,
            location_label="F-10 Markaz, Islamabad",
            location_id=f10.id if f10 else None,
            profession_id=profession_ids.get("cook"),
            employment_type=EmploymentType.FULL_TIME,
            status=JobStatus.OPEN,
        )
        waiter = Job(
            business_id=biz.id,
            title="Front Hall Waiter",
            description="Customer facing with shift rotations. Tips plus meals.",
            salary_min=32000,
            salary_max=38000,
            location_label="Blue Area, Islamabad",
            location_id=blue.id if blue else None,
            profession_id=profession_ids.get("waiter"),
            employment_type=EmploymentType.FULL_TIME,
            status=JobStatus.OPEN,
        )
        db.add(cook)
        db.add(waiter)
        await db.flush()
        for slug in ("shinwari-karahi", "tandoor"):
            skill = await _skill_by_slug(db, slug)
            if skill:
                db.add(JobSkill(job_id=cook.id, skill_id=skill.id))
        table = await _skill_by_slug(db, "table-service")
        if table:
            db.add(JobSkill(job_id=waiter.id, skill_id=table.id))
        return {"demo_users": 3, "demo_jobs": 2}
    return {"demo_users": 3, "demo_jobs": len(existing_jobs)}


async def _run() -> None:
    async with SessionLocal() as db:
        counts = await seed(db)
        print(f"seeded {counts}")


def main() -> None:
    asyncio.run(_run())
