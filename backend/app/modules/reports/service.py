import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import Availability, UsageEventKind
from app.modules.reports.models import UsageEvent
from app.modules.reports.schemas import AnalyticsOut


async def track(
    db: AsyncSession,
    *,
    kind: UsageEventKind,
    actor_user_id: uuid.UUID | None = None,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    flush: bool = False,
) -> None:
    db.add(
        UsageEvent(
            kind=kind,
            actor_user_id=actor_user_id,
            entity_type=entity_type,
            entity_id=entity_id,
        )
    )
    if flush:
        await db.flush()


async def analytics(db: AsyncSession) -> AnalyticsOut:
    from app.modules.auth.models import User, UserRole
    from app.modules.businesses.models import Business, BusinessStatus
    from app.modules.candidacies.models import Candidacy, CandidacySource, CandidacyStatus
    from app.modules.jobs.models import Job, JobStatus
    from app.modules.workers.models import WorkerProfile

    workers_total = (
        await db.execute(select(func.count()).select_from(User).where(User.role == UserRole.WORKER))
    ).scalar_one()
    workers_available = (
        await db.execute(
            select(func.count())
            .select_from(WorkerProfile)
            .join(User, User.id == WorkerProfile.user_id)
            .where(
                User.role == UserRole.WORKER,
                User.is_suspended.is_(False),
                WorkerProfile.availability == Availability.AVAILABLE,
            )
        )
    ).scalar_one()
    businesses_total = (await db.execute(select(func.count()).select_from(Business))).scalar_one()
    businesses_approved = (
        await db.execute(select(func.count()).select_from(Business).where(Business.status == BusinessStatus.ACTIVE))
    ).scalar_one()
    businesses_pending = (
        await db.execute(select(func.count()).select_from(Business).where(Business.status == BusinessStatus.PENDING))
    ).scalar_one()
    jobs_total = (await db.execute(select(func.count()).select_from(Job))).scalar_one()
    jobs_open = (
        await db.execute(select(func.count()).select_from(Job).where(Job.status == JobStatus.OPEN))
    ).scalar_one()
    jobs_closed = (
        await db.execute(select(func.count()).select_from(Job).where(Job.status == JobStatus.CLOSED))
    ).scalar_one()
    jobs_filled = (
        await db.execute(select(func.count()).select_from(Job).where(Job.status == JobStatus.FILLED))
    ).scalar_one()
    applications_total = (
        await db.execute(
            select(func.count()).select_from(Candidacy).where(Candidacy.source == CandidacySource.APPLY)
        )
    ).scalar_one()
    hires_total = (
        await db.execute(select(func.count()).select_from(Candidacy).where(Candidacy.status == CandidacyStatus.HIRED))
    ).scalar_one()
    direct_hires_total = (
        await db.execute(
            select(func.count())
            .select_from(Candidacy)
            .where(Candidacy.status == CandidacyStatus.HIRED, Candidacy.source == CandidacySource.DIRECT_HIRE)
        )
    ).scalar_one()
    cutoff = datetime.now(UTC) - timedelta(days=7)
    active_users = (
        await db.execute(select(func.count()).select_from(User).where(User.last_active_at >= cutoff))
    ).scalar_one()
    jobs_with_hire = (
        await db.execute(
            select(func.count(func.distinct(Candidacy.job_id))).where(Candidacy.status == CandidacyStatus.HIRED)
        )
    ).scalar_one()
    apply_hires = (
        await db.execute(
            select(func.count())
            .select_from(Candidacy)
            .where(Candidacy.status == CandidacyStatus.HIRED, Candidacy.source == CandidacySource.APPLY)
        )
    ).scalar_one()
    event_rows = (
        await db.execute(select(UsageEvent.kind, func.count()).group_by(UsageEvent.kind))
    ).all()
    events = {kind.value: int(count) for kind, count in event_rows}
    app_rate = (apply_hires / applications_total) if applications_total else 0.0
    job_rate = (jobs_with_hire / jobs_total) if jobs_total else 0.0
    return AnalyticsOut(
        workers_total=int(workers_total),
        workers_available=int(workers_available),
        businesses_total=int(businesses_total),
        businesses_approved=int(businesses_approved),
        businesses_pending=int(businesses_pending),
        jobs_total=int(jobs_total),
        jobs_open=int(jobs_open),
        jobs_closed=int(jobs_closed),
        jobs_filled=int(jobs_filled),
        applications_total=int(applications_total),
        hires_total=int(hires_total),
        direct_hires_total=int(direct_hires_total),
        active_users_7d=int(active_users),
        application_to_hire_rate=round(float(app_rate), 4),
        job_to_hire_rate=round(float(job_rate), 4),
        events=events,
    )
