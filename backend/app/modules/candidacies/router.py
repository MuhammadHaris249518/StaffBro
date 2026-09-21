import uuid

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.pagination import Page
from app.core.security import require_role
from app.modules.auth.models import User
from app.modules.candidacies.schemas import ApplyIn, CandidacyOut, DirectHireIn
from app.modules.candidacies.service import (
    apply,
    direct_offer,
    hire,
    list_applicants,
    list_mine,
    mark_review,
    reject,
    respond_offer,
)

router = APIRouter()


@router.post("", response_model=CandidacyOut)
async def apply_route(
    body: ApplyIn,
    user: User = Depends(require_role("WORKER")),
    db: AsyncSession = Depends(get_db),
) -> CandidacyOut:
    return await apply(db, user, body.job_id)


@router.get("/mine", response_model=Page[CandidacyOut])
async def mine_route(
    user: User = Depends(require_role("WORKER")),
    limit: int = Query(default=20, ge=1, le=100),
    cursor: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> Page[CandidacyOut]:
    return await list_mine(db, user, limit, cursor)


@router.get("/applicants", response_model=Page[CandidacyOut])
async def applicants_route(
    job_id: uuid.UUID,
    user: User = Depends(require_role("BUSINESS")),
    db: AsyncSession = Depends(get_db),
) -> Page[CandidacyOut]:
    return await list_applicants(db, user, job_id)


@router.post("/direct-hire", response_model=CandidacyOut)
@router.post("/direct-offer", response_model=CandidacyOut)
async def direct_offer_route(
    body: DirectHireIn,
    user: User = Depends(require_role("BUSINESS")),
    db: AsyncSession = Depends(get_db),
) -> CandidacyOut:
    return await direct_offer(db, user, body.job_id, body.worker_id)


@router.post("/{candidacy_id}/review", response_model=CandidacyOut)
async def review_route(
    candidacy_id: uuid.UUID,
    user: User = Depends(require_role("BUSINESS")),
    db: AsyncSession = Depends(get_db),
) -> CandidacyOut:
    return await mark_review(db, user, candidacy_id)


@router.post("/{candidacy_id}/reject", response_model=CandidacyOut)
async def reject_route(
    candidacy_id: uuid.UUID,
    user: User = Depends(require_role("BUSINESS")),
    db: AsyncSession = Depends(get_db),
) -> CandidacyOut:
    return await reject(db, user, candidacy_id)


@router.post("/{candidacy_id}/hire", response_model=CandidacyOut)
async def hire_route(
    candidacy_id: uuid.UUID,
    user: User = Depends(require_role("BUSINESS")),
    db: AsyncSession = Depends(get_db),
) -> CandidacyOut:
    return await hire(db, user, candidacy_id)


@router.post("/{candidacy_id}/accept", response_model=CandidacyOut)
async def accept_route(
    candidacy_id: uuid.UUID,
    user: User = Depends(require_role("WORKER")),
    db: AsyncSession = Depends(get_db),
) -> CandidacyOut:
    return await respond_offer(db, user, candidacy_id, True)


@router.post("/{candidacy_id}/decline", response_model=CandidacyOut)
async def decline_route(
    candidacy_id: uuid.UUID,
    user: User = Depends(require_role("WORKER")),
    db: AsyncSession = Depends(get_db),
) -> CandidacyOut:
    return await respond_offer(db, user, candidacy_id, False)
