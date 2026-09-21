import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.http import forbidden, not_found
from app.modules.auth.models import User, UserRole
from app.modules.businesses.models import Business, BusinessStatus
from app.modules.businesses.schemas import BusinessOut, BusinessUpdateIn
from app.modules.catalog.models import Location


def to_business_out(biz: Business, owner: User, *, include_phone: bool) -> BusinessOut:
    return BusinessOut(
        id=biz.id,
        owner_user_id=biz.owner_user_id,
        owner_name=owner.full_name,
        owner_phone=owner.phone if include_phone else None,
        name=biz.name,
        status=biz.status.value,
        business_type=biz.business_type.value if biz.business_type else None,
        location_id=biz.location_id,
        location_label=biz.location_label,
        description=biz.description,
        rejected_reason=biz.rejected_reason if include_phone else None,
        phone_verified=owner.phone_verified_at is not None,
        created_at=biz.created_at,
    )


async def owned_business(db: AsyncSession, user: User) -> Business:
    biz = (await db.execute(select(Business).where(Business.owner_user_id == user.id))).scalar_one_or_none()
    if biz is None:
        not_found("Business not found.")
    return biz


async def require_approved_business(db: AsyncSession, user: User) -> Business:
    biz = await owned_business(db, user)
    if biz.status != BusinessStatus.ACTIVE:
        forbidden("Your business must be approved before you can do this.")
    return biz


async def get_mine(db: AsyncSession, user: User) -> BusinessOut:
    biz = await owned_business(db, user)
    return to_business_out(biz, user, include_phone=True)


async def update_mine(db: AsyncSession, user: User, body: BusinessUpdateIn) -> BusinessOut:
    biz = await owned_business(db, user)
    data = body.model_dump(exclude_unset=True)
    if "location_id" in data and data["location_id"] is not None:
        loc = (await db.execute(select(Location).where(Location.id == data["location_id"]))).scalar_one_or_none()
        if loc is None:
            not_found("Location not found.")
        if not data.get("location_label"):
            data["location_label"] = loc.name_en
    if "name" in data and data["name"]:
        data["name"] = data["name"].strip()
        user.full_name = user.full_name
    for key, value in data.items():
        setattr(biz, key, value)
    await db.commit()
    await db.refresh(biz)
    return to_business_out(biz, user, include_phone=True)


async def get_public(db: AsyncSession, business_id: uuid.UUID) -> BusinessOut:
    row = (
        await db.execute(
            select(Business, User).join(User, User.id == Business.owner_user_id).where(Business.id == business_id)
        )
    ).one_or_none()
    if row is None:
        not_found("Business not found.")
    biz, owner = row
    return to_business_out(biz, owner, include_phone=False)
