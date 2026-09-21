import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.enums import EmploymentType
from app.core.pagination import Page
from app.core.security import require_role
from app.modules.auth.models import User
from app.modules.jobs.models import JobStatus
from app.modules.jobs.schemas import JobOut, JobPatchIn, JobWriteIn
from app.modules.jobs.service import create_job, get_job, list_mine, list_open_jobs, set_status, update_job

router = APIRouter()


@router.get("", response_model=Page[JobOut])
async def list_jobs_route(
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = None,
    q: str | None = None,
    profession_id: uuid.UUID | None = None,
    skill_id: uuid.UUID | None = None,
    location_id: uuid.UUID | None = None,
    employment_type: EmploymentType | None = None,
    salary_min: int | None = Query(default=None, ge=0),
    salary_max: int | None = Query(default=None, ge=0),
    db: AsyncSession = Depends(get_db),
) -> Page[JobOut]:
    return await list_open_jobs(
        db,
        limit=limit,
        cursor=cursor,
        q=q,
        profession_id=profession_id,
        skill_id=skill_id,
        location_id=location_id,
        employment_type=employment_type,
        salary_min=salary_min,
        salary_max=salary_max,
    )


@router.get("/mine", response_model=Page[JobOut])
async def mine_jobs_route(
    user: User = Depends(require_role("BUSINESS")),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> Page[JobOut]:
    return await list_mine(db, user, limit, cursor)


@router.post("", response_model=JobOut)
async def create_job_route(
    body: JobWriteIn,
    user: User = Depends(require_role("BUSINESS")),
    db: AsyncSession = Depends(get_db),
) -> JobOut:
    return await create_job(db, user, body)


@router.get("/{job_id}", response_model=JobOut)
async def get_job_route(job_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> JobOut:
    return await get_job(db, job_id)


@router.patch("/{job_id}", response_model=JobOut)
async def patch_job_route(
    job_id: uuid.UUID,
    body: JobPatchIn,
    user: User = Depends(require_role("BUSINESS")),
    db: AsyncSession = Depends(get_db),
) -> JobOut:
    return await update_job(db, user, job_id, body)


@router.post("/{job_id}/close", response_model=JobOut)
async def close_job_route(
    job_id: uuid.UUID,
    user: User = Depends(require_role("BUSINESS")),
    db: AsyncSession = Depends(get_db),
) -> JobOut:
    return await set_status(db, user, job_id, JobStatus.CLOSED)


@router.post("/{job_id}/reopen", response_model=JobOut)
async def reopen_job_route(
    job_id: uuid.UUID,
    user: User = Depends(require_role("BUSINESS")),
    db: AsyncSession = Depends(get_db),
) -> JobOut:
    return await set_status(db, user, job_id, JobStatus.OPEN)


@router.post("/{job_id}/filled", response_model=JobOut)
async def filled_job_route(
    job_id: uuid.UUID,
    user: User = Depends(require_role("BUSINESS")),
    db: AsyncSession = Depends(get_db),
) -> JobOut:
    return await set_status(db, user, job_id, JobStatus.FILLED)
