from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user, require_role
from app.modules.auth.models import User
from app.modules.businesses.schemas import BusinessOut, BusinessUpdateIn
from app.modules.businesses.service import get_mine, get_public, update_mine

router = APIRouter()


@router.get("/me", response_model=BusinessOut)
async def mine_route(
    user: User = Depends(require_role("BUSINESS")), db: AsyncSession = Depends(get_db)
) -> BusinessOut:
    return await get_mine(db, user)


@router.patch("/me", response_model=BusinessOut)
async def update_mine_route(
    body: BusinessUpdateIn,
    user: User = Depends(require_role("BUSINESS")),
    db: AsyncSession = Depends(get_db),
) -> BusinessOut:
    return await update_mine(db, user, body)


@router.get("/{business_id}", response_model=BusinessOut)
async def public_route(
    business_id: str,
    _user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> BusinessOut:
    from uuid import UUID

    return await get_public(db, UUID(business_id))
