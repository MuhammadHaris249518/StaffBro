import html
import uuid

from sqlalchemy import exists, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import EmploymentType, UsageEventKind
from app.core.http import conflict, not_found, unprocessable
from app.core.pagination import Page
from app.modules.auth.models import User
from app.modules.businesses.models import Business, BusinessStatus
from app.modules.businesses.service import require_approved_business
from app.modules.catalog.models import Location, Profession, Skill
from app.modules.jobs.models import Job, JobSkill, JobStatus
from app.modules.jobs.schemas import JobOut, JobPatchIn, JobWriteIn
from app.modules.reports.service import track
from app.modules.workers.schemas import SkillRef


async def _job_skills(db: AsyncSession, job_id: uuid.UUID) -> list[SkillRef]:
    rows = list(
        (
            await db.execute(
                select(Skill).join(JobSkill, JobSkill.skill_id == Skill.id).where(JobSkill.job_id == job_id).order_by(Skill.name_en)
            )
        ).scalars().all()
    )
    return [SkillRef(id=s.id, name_en=s.name_en, name_ur=s.name_ur, slug=s.slug) for s in rows]


def to_job_out(
    job: Job,
    business: Business,
    profession: Profession | None,
    skills: list[SkillRef],
) -> JobOut:
    return JobOut(
        id=job.id,
        business_id=job.business_id,
        business_name=business.name,
        business_status=business.status.value,
        business_approved=business.status == BusinessStatus.ACTIVE,
        title=job.title,
        description=job.description,
        salary_min=job.salary_min,
        salary_max=job.salary_max,
        location_id=job.location_id,
        location_label=job.location_label,
        profession_id=job.profession_id,
        profession_name_en=profession.name_en if profession else None,
        profession_name_ur=profession.name_ur if profession else None,
        employment_type=job.employment_type.value,
        status=job.status.value,
        skills=skills,
        share_path=f"/share/jobs/{job.id}",
        created_at=job.created_at,
        updated_at=job.updated_at,
    )


async def _replace_skills(db: AsyncSession, job_id: uuid.UUID, skill_ids: list[uuid.UUID]) -> None:
    existing = list((await db.execute(select(JobSkill).where(JobSkill.job_id == job_id))).scalars().all())
    for row in existing:
        await db.delete(row)
    if not skill_ids:
        return
    unique = list(dict.fromkeys(skill_ids))
    skills = list((await db.execute(select(Skill).where(Skill.id.in_(unique)))).scalars().all())
    if len(skills) != len(unique):
        not_found("One or more skills were not found.")
    for skill in skills:
        db.add(JobSkill(job_id=job_id, skill_id=skill.id))


async def _load_profession(db: AsyncSession, profession_id: uuid.UUID) -> Profession:
    row = (await db.execute(select(Profession).where(Profession.id == profession_id))).scalar_one_or_none()
    if row is None:
        not_found("Profession not found.")
    return row


async def _resolve_location(
    db: AsyncSession, location_id: uuid.UUID | None, location_label: str | None
) -> tuple[uuid.UUID | None, str]:
    if location_id:
        loc = (await db.execute(select(Location).where(Location.id == location_id))).scalar_one_or_none()
        if loc is None:
            not_found("Location not found.")
        return loc.id, location_label.strip() if location_label else loc.name_en
    if not location_label or len(location_label.strip()) < 2:
        unprocessable("LOCATION_REQUIRED", "Choose an area or enter a location.")
    return None, location_label.strip()


def _salary_ok(min_v: int, max_v: int) -> None:
    if max_v < min_v:
        unprocessable("INVALID_SALARY", "Maximum salary must be at least the minimum.")


async def create_job(db: AsyncSession, user: User, body: JobWriteIn) -> JobOut:
    _salary_ok(body.salary_min, body.salary_max)
    biz = await require_approved_business(db, user)
    profession = await _load_profession(db, body.profession_id)
    location_id, location_label = await _resolve_location(db, body.location_id, body.location_label)
    job = Job(
        business_id=biz.id,
        title=body.title.strip(),
        description=body.description.strip(),
        salary_min=body.salary_min,
        salary_max=body.salary_max,
        location_label=location_label,
        location_id=location_id,
        profession_id=profession.id,
        employment_type=body.employment_type,
        status=JobStatus.OPEN,
    )
    db.add(job)
    await db.flush()
    await _replace_skills(db, job.id, body.skill_ids)
    await track(db, kind=UsageEventKind.JOB_POST, actor_user_id=user.id, entity_type="job", entity_id=job.id)
    await db.commit()
    await db.refresh(job)
    skills = await _job_skills(db, job.id)
    return to_job_out(job, biz, profession, skills)


async def update_job(db: AsyncSession, user: User, job_id: uuid.UUID, body: JobPatchIn) -> JobOut:
    biz = await require_approved_business(db, user)
    job = (await db.execute(select(Job).where(Job.id == job_id, Job.business_id == biz.id))).scalar_one_or_none()
    if job is None:
        not_found("Job not found.")
    data = body.model_dump(exclude_unset=True)
    skill_ids = data.pop("skill_ids", None)
    status = data.pop("status", None)
    if "salary_min" in data or "salary_max" in data:
        _salary_ok(data.get("salary_min", job.salary_min), data.get("salary_max", job.salary_max))
    if "profession_id" in data and data["profession_id"] is not None:
        await _load_profession(db, data["profession_id"])
    if "location_id" in data or "location_label" in data:
        location_id, location_label = await _resolve_location(
            db, data.get("location_id", job.location_id), data.get("location_label", job.location_label)
        )
        data["location_id"] = location_id
        data["location_label"] = location_label
    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip()
        setattr(job, key, value)
    if status is not None:
        job.status = JobStatus(status)
    if skill_ids is not None:
        await _replace_skills(db, job.id, skill_ids)
    await db.commit()
    return await get_job(db, job.id)


async def set_status(db: AsyncSession, user: User, job_id: uuid.UUID, status: JobStatus) -> JobOut:
    biz = await require_approved_business(db, user)
    job = (await db.execute(select(Job).where(Job.id == job_id, Job.business_id == biz.id))).scalar_one_or_none()
    if job is None:
        not_found("Job not found.")
    if status == JobStatus.OPEN and job.status == JobStatus.OPEN:
        conflict("ALREADY_OPEN", "This job is already open.")
    job.status = status
    await db.commit()
    return await get_job(db, job.id)


async def get_job(db: AsyncSession, job_id: uuid.UUID) -> JobOut:
    row = (
        await db.execute(
            select(Job, Business, Profession)
            .join(Business, Business.id == Job.business_id)
            .outerjoin(Profession, Profession.id == Job.profession_id)
            .where(Job.id == job_id)
        )
    ).one_or_none()
    if row is None:
        not_found("Job not found.")
    job, biz, profession = row
    return to_job_out(job, biz, profession, await _job_skills(db, job.id))


async def list_open_jobs(
    db: AsyncSession,
    *,
    limit: int,
    cursor: str | None,
    q: str | None = None,
    profession_id: uuid.UUID | None = None,
    skill_id: uuid.UUID | None = None,
    location_id: uuid.UUID | None = None,
    employment_type: EmploymentType | None = None,
    salary_min: int | None = None,
    salary_max: int | None = None,
) -> Page[JobOut]:
    stmt = (
        select(Job, Business, Profession)
        .join(Business, Business.id == Job.business_id)
        .outerjoin(Profession, Profession.id == Job.profession_id)
        .where(Job.status == JobStatus.OPEN, Business.status == BusinessStatus.ACTIVE)
    )
    if profession_id:
        stmt = stmt.where(Job.profession_id == profession_id)
    if location_id:
        stmt = stmt.where(Job.location_id == location_id)
    if employment_type:
        stmt = stmt.where(Job.employment_type == employment_type)
    if salary_min is not None:
        stmt = stmt.where(Job.salary_max >= salary_min)
    if salary_max is not None:
        stmt = stmt.where(Job.salary_min <= salary_max)
    if skill_id:
        stmt = stmt.where(
            exists(select(JobSkill.id).where(JobSkill.job_id == Job.id, JobSkill.skill_id == skill_id))
        )
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Job.title.ilike(like),
                Job.description.ilike(like),
                Job.location_label.ilike(like),
                Business.name.ilike(like),
                Profession.name_en.ilike(like),
                Profession.name_ur.ilike(like),
            )
        )
    if cursor:
        stmt = stmt.where(Job.id > uuid.UUID(cursor))
    stmt = stmt.order_by(Job.id).limit(limit + 1)
    rows = list((await db.execute(stmt)).all())
    next_cursor = str(rows[-1][0].id) if len(rows) > limit else None
    items = [
        to_job_out(job, biz, profession, await _job_skills(db, job.id)) for job, biz, profession in rows[:limit]
    ]
    return Page(items=items, next_cursor=next_cursor)


async def list_mine(db: AsyncSession, user: User, limit: int, cursor: str | None) -> Page[JobOut]:
    from app.modules.businesses.service import owned_business

    biz = await owned_business(db, user)
    stmt = (
        select(Job, Profession)
        .outerjoin(Profession, Profession.id == Job.profession_id)
        .where(Job.business_id == biz.id)
    )
    if cursor:
        stmt = stmt.where(Job.id > uuid.UUID(cursor))
    stmt = stmt.order_by(Job.id).limit(limit + 1)
    rows = list((await db.execute(stmt)).all())
    next_cursor = str(rows[-1][0].id) if len(rows) > limit else None
    items = [to_job_out(job, biz, profession, await _job_skills(db, job.id)) for job, profession in rows[:limit]]
    return Page(items=items, next_cursor=next_cursor)


def share_html(job: JobOut) -> str:
    title = html.escape(job.title)
    biz = html.escape(job.business_name)
    desc = html.escape(job.description)
    loc = html.escape(job.location_label)
    prof = html.escape(job.profession_name_en or "Frontline role")
    pay = f"PKR {job.salary_min:,} – {job.salary_max:,}"
    skills = ", ".join(html.escape(s.name_en) for s in job.skills) or "—"
    badge = "Approved business" if job.business_approved else "Business"
    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>{title} · Staffbro</title>
<style>
body{{margin:0;font-family:"Noto Sans",system-ui,sans-serif;background:#f8f9ff;color:#0b1c30}}
main{{max-width:480px;margin:0 auto;padding:24px 16px}}
h1{{font-family:"Plus Jakarta Sans",system-ui,sans-serif;color:#005f42;font-size:24px}}
.card{{background:#fff;border:1px solid #bec9c1;border-radius:12px;padding:16px}}
.badge{{display:inline-block;background:#98f5ca;color:#002114;border-radius:999px;padding:2px 10px;font-size:12px;font-weight:700}}
.pay{{color:#006029;font-weight:800}}
a.cta{{display:block;margin-top:16px;background:#005f42;color:#fff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:700}}
</style></head>
<body><main>
<p class="badge">{html.escape(badge)}</p>
<h1>{title}</h1>
<div class="card">
<p><strong>{biz}</strong> · {html.escape(job.employment_type.replace("_", " ").title())}</p>
<p>{prof} · {loc}</p>
<p class="pay">{pay}</p>
<p>{desc}</p>
<p>Skills: {skills}</p>
</div>
<a class="cta" href="/">Open Staffbro</a>
<p style="color:#545f73;font-size:13px">100% Free for workers · Islamabad &amp; Rawalpindi</p>
</main></body></html>"""
