import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.enums import Availability, EmploymentType
from app.core.pagination import Page
from app.core.security import get_current_user, require_role
from app.modules.auth.models import User
from app.modules.workers.schemas import WorkerCardOut, WorkerProfileOut, WorkerProfileUpdateIn
from app.modules.workers.service import get_mine, get_preview, list_seekers, update_mine

router = APIRouter()


@router.get("/me", response_model=WorkerProfileOut)
async def mine_route(
    user: User = Depends(require_role("WORKER")), db: AsyncSession = Depends(get_db)
) -> WorkerProfileOut:
    return await get_mine(db, user)


@router.patch("/me", response_model=WorkerProfileOut)
async def update_mine_route(
    body: WorkerProfileUpdateIn,
    user: User = Depends(require_role("WORKER")),
    db: AsyncSession = Depends(get_db),
) -> WorkerProfileOut:
    return await update_mine(db, user, body)


@router.get("", response_model=Page[WorkerCardOut])
async def list_workers_route(
    user: User = Depends(require_role("BUSINESS", "ADMIN")),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = None,
    q: str | None = None,
    profession_id: uuid.UUID | None = None,
    skill_id: uuid.UUID | None = None,
    location_id: uuid.UUID | None = None,
    employment_type: EmploymentType | None = None,
    availability: Availability | None = Availability.AVAILABLE,
    salary_min: int | None = Query(default=None, ge=0),
    salary_max: int | None = Query(default=None, ge=0),
    experience_min: int | None = Query(default=None, ge=0),
    db: AsyncSession = Depends(get_db),
) -> Page[WorkerCardOut]:
    return await list_seekers(
        db,
        viewer=user,
        limit=limit,
        cursor=cursor,
        q=q,
        profession_id=profession_id,
        skill_id=skill_id,
        location_id=location_id,
        employment_type=employment_type,
        availability=availability,
        salary_min=salary_min,
        salary_max=salary_max,
        experience_min=experience_min,
    )


@router.get("/{worker_id}", response_model=WorkerProfileOut)
async def preview_route(
    worker_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WorkerProfileOut:
    return await get_preview(db, user, worker_id)
