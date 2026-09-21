import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import AuditAction, NotificationKind
from app.core.http import conflict, not_found
from app.core.pagination import Page
from app.modules.admin.models import AdminAuditLog
from app.modules.admin.schemas import (
    AdminBusinessOut,
    AdminCandidacyOut,
    AdminJobOut,
    AdminUserOut,
    AuditOut,
    DashboardOut,
)
from app.modules.auth.models import User, UserRole
from app.modules.businesses.models import Business, BusinessStatus
from app.modules.candidacies.models import Candidacy
from app.modules.jobs.models import Job, JobStatus
from app.modules.notifications.service import notify
from app.modules.reports.service import analytics


async def write_audit(
    db: AsyncSession,
    admin: User,
    action: AuditAction,
    target_type: str,
    target_id: uuid.UUID | None,
    note: str | None = None,
) -> None:
    db.add(
        AdminAuditLog(
            admin_user_id=admin.id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            note=note,
        )
    )


async def dashboard(db: AsyncSession) -> DashboardOut:
    stats = await analytics(db)
    pending = (
        await db.execute(select(Business).where(Business.status == BusinessStatus.PENDING))
    ).scalars().all()
    suspended = (
        await db.execute(select(User).where(User.is_suspended.is_(True)))
    ).scalars().all()
    return DashboardOut(analytics=stats, pending_businesses=len(pending), suspended_users=len(suspended))


async def list_businesses(db: AsyncSession, status: BusinessStatus | None) -> Page[AdminBusinessOut]:
    stmt = select(Business, User).join(User, User.id == Business.owner_user_id)
    if status:
        stmt = stmt.where(Business.status == status)
    stmt = stmt.order_by(Business.created_at.desc())
    rows = list((await db.execute(stmt)).all())
    items = [
        AdminBusinessOut(
            id=biz.id,
            name=biz.name,
            status=biz.status.value,
            business_type=biz.business_type.value if biz.business_type else None,
            location_label=biz.location_label,
            description=biz.description,
            owner_name=owner.full_name,
            owner_phone=owner.phone,
            created_at=biz.created_at,
        )
        for biz, owner in rows
    ]
    return Page(items=items, next_cursor=None)


async def approve_business(db: AsyncSession, admin: User, business_id: uuid.UUID) -> AdminBusinessOut:
    row = (
        await db.execute(
            select(Business, User).join(User, User.id == Business.owner_user_id).where(Business.id == business_id)
        )
    ).one_or_none()
    if row is None:
        not_found("Business not found.")
    biz, owner = row
    biz.status = BusinessStatus.ACTIVE
    biz.rejected_reason = None
    biz.reviewed_at = datetime.now(UTC)
    biz.reviewed_by_id = admin.id
    await write_audit(db, admin, AuditAction.BUSINESS_APPROVE, "business", biz.id)
    await notify(
        db,
        user_id=owner.id,
        kind=NotificationKind.BUSINESS_APPROVED,
        title="Business approved",
        body=f"{biz.name} can now post jobs on Staffbro.",
        entity_type="business",
        entity_id=biz.id,
    )
    await db.commit()
    return AdminBusinessOut(
        id=biz.id,
        name=biz.name,
        status=biz.status.value,
        business_type=biz.business_type.value if biz.business_type else None,
        location_label=biz.location_label,
        description=biz.description,
        owner_name=owner.full_name,
        owner_phone=owner.phone,
        created_at=biz.created_at,
    )


async def reject_business(db: AsyncSession, admin: User, business_id: uuid.UUID, reason: str) -> AdminBusinessOut:
    row = (
        await db.execute(
            select(Business, User).join(User, User.id == Business.owner_user_id).where(Business.id == business_id)
        )
    ).one_or_none()
    if row is None:
        not_found("Business not found.")
    biz, owner = row
    biz.status = BusinessStatus.REJECTED
    biz.rejected_reason = reason
    biz.reviewed_at = datetime.now(UTC)
    biz.reviewed_by_id = admin.id
    await write_audit(db, admin, AuditAction.BUSINESS_REJECT, "business", biz.id, reason)
    await notify(
        db,
        user_id=owner.id,
        kind=NotificationKind.BUSINESS_REJECTED,
        title="Business not approved",
        body=reason,
        entity_type="business",
        entity_id=biz.id,
    )
    await db.commit()
    return AdminBusinessOut(
        id=biz.id,
        name=biz.name,
        status=biz.status.value,
        business_type=biz.business_type.value if biz.business_type else None,
        location_label=biz.location_label,
        description=biz.description,
        owner_name=owner.full_name,
        owner_phone=owner.phone,
        created_at=biz.created_at,
    )


async def list_users(db: AsyncSession) -> Page[AdminUserOut]:
    rows = list((await db.execute(select(User).order_by(User.created_at.desc()))).scalars().all())
    items = [
        AdminUserOut(
            id=u.id,
            full_name=u.full_name,
            phone=u.phone,
            role=u.role.value,
            is_suspended=u.is_suspended,
            phone_verified=u.phone_verified_at is not None,
            last_active_at=u.last_active_at,
            created_at=u.created_at,
        )
        for u in rows
    ]
    return Page(items=items, next_cursor=None)


async def set_suspended(db: AsyncSession, admin: User, user_id: uuid.UUID, suspended: bool) -> AdminUserOut:
    user = (await db.execute(select(User).where(User.id == user_id))).scalar_one_or_none()
    if user is None:
        not_found("User not found.")
    if user.role == UserRole.ADMIN:
        conflict("CANNOT_SUSPEND_ADMIN", "Admin accounts cannot be suspended here.")
    user.is_suspended = suspended
    await write_audit(
        db,
        admin,
        AuditAction.USER_SUSPEND if suspended else AuditAction.USER_UNSUSPEND,
        "user",
        user.id,
    )
    if suspended:
        await notify(
            db,
            user_id=user.id,
            kind=NotificationKind.ACCOUNT,
            title="Account suspended",
            body="A Staffbro admin suspended this account.",
            entity_type="user",
            entity_id=user.id,
        )
    await db.commit()
    await db.refresh(user)
    return AdminUserOut(
        id=user.id,
        full_name=user.full_name,
        phone=user.phone,
        role=user.role.value,
        is_suspended=user.is_suspended,
        phone_verified=user.phone_verified_at is not None,
        last_active_at=user.last_active_at,
        created_at=user.created_at,
    )


async def list_jobs(db: AsyncSession) -> Page[AdminJobOut]:
    rows = list(
        (
            await db.execute(
                select(Job, Business).join(Business, Business.id == Job.business_id).order_by(Job.created_at.desc())
            )
        ).all()
    )
    items = [
        AdminJobOut(
            id=job.id,
            title=job.title,
            business_name=biz.name,
            status=job.status.value,
            location_label=job.location_label,
            created_at=job.created_at,
        )
        for job, biz in rows
    ]
    return Page(items=items, next_cursor=None)


async def admin_close_job(db: AsyncSession, admin: User, job_id: uuid.UUID) -> AdminJobOut:
    row = (
        await db.execute(select(Job, Business).join(Business, Business.id == Job.business_id).where(Job.id == job_id))
    ).one_or_none()
    if row is None:
        not_found("Job not found.")
    job, biz = row
    job.status = JobStatus.CLOSED
    await write_audit(db, admin, AuditAction.JOB_CLOSE, "job", job.id)
    await db.commit()
    return AdminJobOut(
        id=job.id,
        title=job.title,
        business_name=biz.name,
        status=job.status.value,
        location_label=job.location_label,
        created_at=job.created_at,
    )


async def list_applications(db: AsyncSession) -> Page[AdminCandidacyOut]:
    rows = list(
        (
            await db.execute(
                select(Candidacy, Job, Business, User)
                .join(Job, Job.id == Candidacy.job_id)
                .join(Business, Business.id == Job.business_id)
                .join(User, User.id == Candidacy.worker_user_id)
                .order_by(Candidacy.created_at.desc())
            )
        ).all()
    )
    items = [
        AdminCandidacyOut(
            id=cand.id,
            job_title=job.title,
            worker_name=worker.full_name,
            business_name=biz.name,
            status=cand.status.value,
            source=cand.source.value,
            created_at=cand.created_at,
        )
        for cand, job, biz, worker in rows
    ]
    return Page(items=items, next_cursor=None)


async def list_audit(db: AsyncSession) -> Page[AuditOut]:
    rows = list((await db.execute(select(AdminAuditLog).order_by(AdminAuditLog.created_at.desc()).limit(200))).scalars().all())
    items = [
        AuditOut(
            id=row.id,
            admin_user_id=row.admin_user_id,
            action=row.action.value,
            target_type=row.target_type,
            target_id=row.target_id,
            note=row.note,
            created_at=row.created_at,
        )
        for row in rows
    ]
    return Page(items=items, next_cursor=None)
