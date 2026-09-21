import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import NotificationKind, UsageEventKind
from app.core.http import conflict, forbidden, not_found
from app.core.pagination import Page
from app.modules.auth.models import User, UserRole
from app.modules.businesses.models import Business, BusinessStatus
from app.modules.businesses.service import require_approved_business
from app.modules.candidacies.models import Candidacy, CandidacySource, CandidacyStatus
from app.modules.candidacies.schemas import CandidacyOut
from app.modules.jobs.models import Job, JobStatus
from app.modules.notifications.service import notify
from app.modules.reports.service import track
from app.modules.workers.models import WorkerProfile


def _out(
    cand: Candidacy,
    *,
    job_title: str,
    business_name: str,
    business_approved: bool,
    worker_name: str,
    worker_headline: str | None,
    viewer: User,
    worker_phone: str,
    business_owner_phone: str | None,
) -> CandidacyOut:
    contact = None
    if cand.status == CandidacyStatus.HIRED:
        if viewer.role == UserRole.WORKER:
            contact = business_owner_phone
        else:
            contact = worker_phone
    offered = cand.status == CandidacyStatus.OFFERED and viewer.role == UserRole.WORKER
    return CandidacyOut(
        id=cand.id,
        job_id=cand.job_id,
        job_title=job_title,
        business_name=business_name,
        business_approved=business_approved,
        worker_id=cand.worker_user_id,
        worker_name=worker_name,
        worker_headline=worker_headline,
        status=cand.status.value,
        source=cand.source.value,
        contact_phone=contact,
        can_accept=offered,
        can_decline=offered,
    )


async def _job_bundle(db: AsyncSession, job_id: uuid.UUID) -> tuple[Job, Business, User]:
    row = (
        await db.execute(
            select(Job, Business, User)
            .join(Business, Business.id == Job.business_id)
            .join(User, User.id == Business.owner_user_id)
            .where(Job.id == job_id)
        )
    ).one_or_none()
    if row is None:
        not_found("Job not found.")
    return row[0], row[1], row[2]


async def _headline(db: AsyncSession, worker_id: uuid.UUID) -> str | None:
    profile = (await db.execute(select(WorkerProfile).where(WorkerProfile.user_id == worker_id))).scalar_one_or_none()
    return profile.headline if profile else None


async def apply(db: AsyncSession, worker: User, job_id: uuid.UUID) -> CandidacyOut:
    if worker.role != UserRole.WORKER:
        forbidden("Only job seekers can apply.")
    job, biz, owner = await _job_bundle(db, job_id)
    if biz.status != BusinessStatus.ACTIVE:
        not_found("Job not found.")
    if job.status != JobStatus.OPEN:
        conflict("JOB_CLOSED", "This job is no longer open.")
    existing = (
        await db.execute(select(Candidacy).where(Candidacy.job_id == job_id, Candidacy.worker_user_id == worker.id))
    ).scalar_one_or_none()
    if existing:
        conflict("ALREADY_APPLIED", "You already applied to this job.")
    cand = Candidacy(
        job_id=job_id,
        worker_user_id=worker.id,
        status=CandidacyStatus.APPLIED,
        source=CandidacySource.APPLY,
    )
    db.add(cand)
    await db.flush()
    await notify(
        db,
        user_id=owner.id,
        kind=NotificationKind.APPLICATION_RECEIVED,
        title="New application",
        body=f"{worker.full_name} applied for {job.title}.",
        entity_type="candidacy",
        entity_id=cand.id,
    )
    await notify(
        db,
        user_id=worker.id,
        kind=NotificationKind.APPLICATION_STATUS,
        title="Application sent",
        body=f"Your application for {job.title} at {biz.name} was submitted.",
        entity_type="candidacy",
        entity_id=cand.id,
    )
    await track(db, kind=UsageEventKind.APPLICATION, actor_user_id=worker.id, entity_type="job", entity_id=job.id)
    await db.commit()
    await db.refresh(cand)
    return _out(
        cand,
        job_title=job.title,
        business_name=biz.name,
        business_approved=True,
        worker_name=worker.full_name,
        worker_headline=await _headline(db, worker.id),
        viewer=worker,
        worker_phone=worker.phone,
        business_owner_phone=owner.phone,
    )


async def list_mine(db: AsyncSession, worker: User, limit: int, cursor: str | None) -> Page[CandidacyOut]:
    stmt = (
        select(Candidacy, Job, Business, User)
        .join(Job, Job.id == Candidacy.job_id)
        .join(Business, Business.id == Job.business_id)
        .join(User, User.id == Business.owner_user_id)
        .where(Candidacy.worker_user_id == worker.id)
    )
    if cursor:
        stmt = stmt.where(Candidacy.id > uuid.UUID(cursor))
    stmt = stmt.order_by(Candidacy.id).limit(limit + 1)
    rows = list((await db.execute(stmt)).all())
    next_cursor = str(rows[-1][0].id) if len(rows) > limit else None
    items = [
        _out(
            cand,
            job_title=job.title,
            business_name=biz.name,
            business_approved=biz.status == BusinessStatus.ACTIVE,
            worker_name=worker.full_name,
            worker_headline=None,
            viewer=worker,
            worker_phone=worker.phone,
            business_owner_phone=owner.phone,
        )
        for cand, job, biz, owner in rows[:limit]
    ]
    return Page(items=items, next_cursor=next_cursor)


async def list_applicants(db: AsyncSession, manager: User, job_id: uuid.UUID) -> Page[CandidacyOut]:
    job, biz, owner = await _job_bundle(db, job_id)
    if biz.owner_user_id != manager.id:
        not_found("Job not found.")
    rows = list(
        (
            await db.execute(
                select(Candidacy, User)
                .join(User, User.id == Candidacy.worker_user_id)
                .where(Candidacy.job_id == job_id)
                .order_by(Candidacy.id)
            )
        ).all()
    )
    items = [
        _out(
            cand,
            job_title=job.title,
            business_name=biz.name,
            business_approved=biz.status == BusinessStatus.ACTIVE,
            worker_name=w.full_name,
            worker_headline=await _headline(db, w.id),
            viewer=manager,
            worker_phone=w.phone,
            business_owner_phone=owner.phone,
        )
        for cand, w in rows
    ]
    return Page(items=items, next_cursor=None)


async def _owned_candidacy(db: AsyncSession, manager: User, candidacy_id: uuid.UUID) -> tuple[Candidacy, Job, Business, User]:
    row = (
        await db.execute(
            select(Candidacy, Job, Business, User)
            .join(Job, Job.id == Candidacy.job_id)
            .join(Business, Business.id == Job.business_id)
            .join(User, User.id == Candidacy.worker_user_id)
            .where(Candidacy.id == candidacy_id)
        )
    ).one_or_none()
    if row is None or row[2].owner_user_id != manager.id:
        not_found("Application not found.")
    return row[0], row[1], row[2], row[3]


async def _notify_status(db: AsyncSession, worker_id: uuid.UUID, job_title: str, status: CandidacyStatus, cand_id: uuid.UUID) -> None:
    labels = {
        CandidacyStatus.IN_REVIEW: "In review",
        CandidacyStatus.HIRED: "Hired",
        CandidacyStatus.REJECTED: "Rejected",
        CandidacyStatus.OFFERED: "Offer received",
        CandidacyStatus.APPLIED: "Applied",
    }
    await notify(
        db,
        user_id=worker_id,
        kind=NotificationKind.APPLICATION_STATUS if status != CandidacyStatus.HIRED else NotificationKind.HIRED,
        title=labels[status],
        body=f"Your application for {job_title} is now {labels[status]}.",
        entity_type="candidacy",
        entity_id=cand_id,
    )


async def mark_review(db: AsyncSession, manager: User, candidacy_id: uuid.UUID) -> CandidacyOut:
    await require_approved_business(db, manager)
    cand, job, biz, worker = await _owned_candidacy(db, manager, candidacy_id)
    if cand.status not in {CandidacyStatus.APPLIED, CandidacyStatus.IN_REVIEW}:
        conflict("INVALID_STATUS", "This application cannot move to in review.")
    cand.status = CandidacyStatus.IN_REVIEW
    await _notify_status(db, worker.id, job.title, cand.status, cand.id)
    await db.commit()
    await db.refresh(cand)
    return _out(
        cand,
        job_title=job.title,
        business_name=biz.name,
        business_approved=True,
        worker_name=worker.full_name,
        worker_headline=await _headline(db, worker.id),
        viewer=manager,
        worker_phone=worker.phone,
        business_owner_phone=manager.phone,
    )


async def reject(db: AsyncSession, manager: User, candidacy_id: uuid.UUID) -> CandidacyOut:
    await require_approved_business(db, manager)
    cand, job, biz, worker = await _owned_candidacy(db, manager, candidacy_id)
    if cand.status == CandidacyStatus.HIRED:
        conflict("ALREADY_HIRED", "A hired application cannot be rejected.")
    cand.status = CandidacyStatus.REJECTED
    await _notify_status(db, worker.id, job.title, cand.status, cand.id)
    await db.commit()
    await db.refresh(cand)
    return _out(
        cand,
        job_title=job.title,
        business_name=biz.name,
        business_approved=True,
        worker_name=worker.full_name,
        worker_headline=await _headline(db, worker.id),
        viewer=manager,
        worker_phone=worker.phone,
        business_owner_phone=manager.phone,
    )


async def hire(db: AsyncSession, manager: User, candidacy_id: uuid.UUID) -> CandidacyOut:
    await require_approved_business(db, manager)
    cand, job, biz, worker = await _owned_candidacy(db, manager, candidacy_id)
    if cand.status == CandidacyStatus.REJECTED:
        conflict("REJECTED", "This application was already rejected.")
    cand.status = CandidacyStatus.HIRED
    job.status = JobStatus.FILLED
    await notify(
        db,
        user_id=worker.id,
        kind=NotificationKind.HIRED,
        title="You were hired",
        body=f"{biz.name} hired you for {job.title}. You can now call or WhatsApp them.",
        entity_type="candidacy",
        entity_id=cand.id,
    )
    await notify(
        db,
        user_id=manager.id,
        kind=NotificationKind.HIRED,
        title="Hire confirmed",
        body=f"You hired {worker.full_name} for {job.title}. Contact is now unlocked.",
        entity_type="candidacy",
        entity_id=cand.id,
    )
    await track(db, kind=UsageEventKind.HIRE, actor_user_id=manager.id, entity_type="candidacy", entity_id=cand.id)
    await db.commit()
    await db.refresh(cand)
    return _out(
        cand,
        job_title=job.title,
        business_name=biz.name,
        business_approved=True,
        worker_name=worker.full_name,
        worker_headline=await _headline(db, worker.id),
        viewer=manager,
        worker_phone=worker.phone,
        business_owner_phone=manager.phone,
    )


async def direct_offer(db: AsyncSession, manager: User, job_id: uuid.UUID, worker_id: uuid.UUID) -> CandidacyOut:
    await require_approved_business(db, manager)
    job, biz, owner = await _job_bundle(db, job_id)
    if biz.owner_user_id != manager.id:
        not_found("Job not found.")
    if job.status != JobStatus.OPEN:
        conflict("JOB_CLOSED", "This job is no longer open.")
    worker = (
        await db.execute(select(User).where(User.id == worker_id, User.role == UserRole.WORKER))
    ).scalar_one_or_none()
    if worker is None or worker.is_suspended:
        not_found("Job seeker not found.")
    existing = (
        await db.execute(select(Candidacy).where(Candidacy.job_id == job_id, Candidacy.worker_user_id == worker_id))
    ).scalar_one_or_none()
    if existing and existing.status == CandidacyStatus.HIRED:
        conflict("ALREADY_HIRED", "This seeker is already hired for this job.")
    if existing and existing.status == CandidacyStatus.OFFERED:
        cand = existing
    elif existing:
        existing.status = CandidacyStatus.OFFERED
        existing.source = CandidacySource.DIRECT_HIRE
        cand = existing
    else:
        cand = Candidacy(
            job_id=job_id,
            worker_user_id=worker_id,
            status=CandidacyStatus.OFFERED,
            source=CandidacySource.DIRECT_HIRE,
        )
        db.add(cand)
        await db.flush()
    await notify(
        db,
        user_id=worker.id,
        kind=NotificationKind.DIRECT_OFFER,
        title="Direct job offer",
        body=f"{biz.name} offered you {job.title}. Accept or decline in Applications.",
        entity_type="candidacy",
        entity_id=cand.id,
    )
    await track(db, kind=UsageEventKind.DIRECT_OFFER, actor_user_id=manager.id, entity_type="candidacy", entity_id=cand.id)
    await db.commit()
    await db.refresh(cand)
    return _out(
        cand,
        job_title=job.title,
        business_name=biz.name,
        business_approved=True,
        worker_name=worker.full_name,
        worker_headline=await _headline(db, worker.id),
        viewer=manager,
        worker_phone=worker.phone,
        business_owner_phone=owner.phone,
    )


async def respond_offer(db: AsyncSession, worker: User, candidacy_id: uuid.UUID, accept: bool) -> CandidacyOut:
    row = (
        await db.execute(
            select(Candidacy, Job, Business, User)
            .join(Job, Job.id == Candidacy.job_id)
            .join(Business, Business.id == Job.business_id)
            .join(User, User.id == Business.owner_user_id)
            .where(Candidacy.id == candidacy_id, Candidacy.worker_user_id == worker.id)
        )
    ).one_or_none()
    if row is None:
        not_found("Offer not found.")
    cand, job, biz, owner = row
    if cand.status != CandidacyStatus.OFFERED:
        conflict("NOT_AN_OFFER", "This application is not waiting for your response.")
    cand.status = CandidacyStatus.HIRED if accept else CandidacyStatus.REJECTED
    if accept:
        job.status = JobStatus.FILLED
        await notify(
            db,
            user_id=owner.id,
            kind=NotificationKind.HIRED,
            title="Offer accepted",
            body=f"{worker.full_name} accepted {job.title}. Contact is unlocked.",
            entity_type="candidacy",
            entity_id=cand.id,
        )
        await notify(
            db,
            user_id=worker.id,
            kind=NotificationKind.HIRED,
            title="You accepted the offer",
            body=f"You can now call or WhatsApp {biz.name}.",
            entity_type="candidacy",
            entity_id=cand.id,
        )
        await track(db, kind=UsageEventKind.HIRE, actor_user_id=worker.id, entity_type="candidacy", entity_id=cand.id)
    else:
        await notify(
            db,
            user_id=owner.id,
            kind=NotificationKind.APPLICATION_STATUS,
            title="Offer declined",
            body=f"{worker.full_name} declined {job.title}.",
            entity_type="candidacy",
            entity_id=cand.id,
        )
    await db.commit()
    await db.refresh(cand)
    return _out(
        cand,
        job_title=job.title,
        business_name=biz.name,
        business_approved=biz.status == BusinessStatus.ACTIVE,
        worker_name=worker.full_name,
        worker_headline=await _headline(db, worker.id),
        viewer=worker,
        worker_phone=worker.phone,
        business_owner_phone=owner.phone,
    )
