import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.pagination import Page
from app.core.security import require_role
from app.modules.admin.schemas import (
    AdminBusinessOut,
    AdminCandidacyOut,
    AdminJobOut,
    AdminUserOut,
    AuditOut,
    DashboardOut,
    RejectBusinessIn,
)
from app.modules.auth.models import User
from app.modules.admin.service import (
    admin_close_job,
    approve_business,
    dashboard,
    list_applications,
    list_audit,
    list_businesses,
    list_jobs,
    list_users,
    reject_business,
    set_suspended,
)
from app.modules.businesses.models import BusinessStatus
from app.modules.reports.schemas import AnalyticsOut
from app.modules.reports.service import analytics

router = APIRouter()


@router.get("/dashboard", response_model=DashboardOut)
async def dashboard_route(
    _user: User = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db)
) -> DashboardOut:
    return await dashboard(db)


@router.get("/analytics", response_model=AnalyticsOut)
async def analytics_route(
    _user: User = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db)
) -> AnalyticsOut:
    return await analytics(db)


@router.get("/businesses", response_model=Page[AdminBusinessOut])
async def businesses_route(
    status: BusinessStatus | None = Query(default=None),
    _user: User = Depends(require_role("ADMIN")),
    db: AsyncSession = Depends(get_db),
) -> Page[AdminBusinessOut]:
    return await list_businesses(db, status)


@router.post("/businesses/{business_id}/approve", response_model=AdminBusinessOut)
async def approve_route(
    business_id: uuid.UUID,
    user: User = Depends(require_role("ADMIN")),
    db: AsyncSession = Depends(get_db),
) -> AdminBusinessOut:
    return await approve_business(db, user, business_id)


@router.post("/businesses/{business_id}/reject", response_model=AdminBusinessOut)
async def reject_route(
    business_id: uuid.UUID,
    body: RejectBusinessIn,
    user: User = Depends(require_role("ADMIN")),
    db: AsyncSession = Depends(get_db),
) -> AdminBusinessOut:
    return await reject_business(db, user, business_id, body.reason)


@router.get("/users", response_model=Page[AdminUserOut])
async def users_route(
    _user: User = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db)
) -> Page[AdminUserOut]:
    return await list_users(db)


@router.post("/users/{user_id}/suspend", response_model=AdminUserOut)
async def suspend_route(
    user_id: uuid.UUID,
    user: User = Depends(require_role("ADMIN")),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    return await set_suspended(db, user, user_id, True)


@router.post("/users/{user_id}/unsuspend", response_model=AdminUserOut)
async def unsuspend_route(
    user_id: uuid.UUID,
    user: User = Depends(require_role("ADMIN")),
    db: AsyncSession = Depends(get_db),
) -> AdminUserOut:
    return await set_suspended(db, user, user_id, False)


@router.get("/jobs", response_model=Page[AdminJobOut])
async def jobs_route(
    _user: User = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db)
) -> Page[AdminJobOut]:
    return await list_jobs(db)


@router.post("/jobs/{job_id}/close", response_model=AdminJobOut)
async def close_job_route(
    job_id: uuid.UUID,
    user: User = Depends(require_role("ADMIN")),
    db: AsyncSession = Depends(get_db),
) -> AdminJobOut:
    return await admin_close_job(db, user, job_id)


@router.get("/applications", response_model=Page[AdminCandidacyOut])
async def applications_route(
    _user: User = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db)
) -> Page[AdminCandidacyOut]:
    return await list_applications(db)


@router.get("/audit", response_model=Page[AuditOut])
async def audit_route(
    _user: User = Depends(require_role("ADMIN")), db: AsyncSession = Depends(get_db)
) -> Page[AuditOut]:
    return await list_audit(db)
