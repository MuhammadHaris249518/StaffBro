from datetime import UTC, datetime

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.enums import NotificationKind, UsageEventKind
from app.core.security import create_access_token, hash_password, verify_password
from app.modules.auth.models import User, UserRole
from app.modules.auth.schemas import LoginIn, MeOut, RegisterIn, TokenOut, UserOut
from app.modules.businesses.models import Business, BusinessStatus
from app.modules.notifications.models import Notification
from app.modules.notifications.service import notify
from app.modules.reports.service import track
from app.modules.workers.models import WorkerProfile
from app.utils.phone import normalize_pk_phone


async def _user_out(db: AsyncSession, user: User) -> UserOut:
    business_id = None
    business_name = None
    business_status = None
    if user.role == UserRole.BUSINESS:
        biz = (await db.execute(select(Business).where(Business.owner_user_id == user.id))).scalar_one_or_none()
        if biz:
            business_id = biz.id
            business_name = biz.name
            business_status = biz.status.value
    return UserOut(
        id=user.id,
        phone=user.phone,
        role=user.role.value,
        full_name=user.full_name,
        phone_verified=user.phone_verified_at is not None,
        business_id=business_id,
        business_name=business_name,
        business_status=business_status,
    )


async def me(db: AsyncSession, user: User) -> MeOut:
    base = await _user_out(db, user)
    unread = (
        await db.execute(
            select(func.count()).select_from(Notification).where(
                Notification.user_id == user.id, Notification.is_read.is_(False)
            )
        )
    ).scalar_one()
    return MeOut(**base.model_dump(), tos_accepted_at=user.tos_accepted_at, unread_notifications=int(unread))


async def register(db: AsyncSession, body: RegisterIn) -> TokenOut:
    if not body.tos_accepted:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"code": "TOS_REQUIRED", "message": "Accept the Terms of Service to create an account."},
        )
    phone = normalize_pk_phone(body.phone)
    existing = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "PHONE_TAKEN", "message": "This phone is already registered."},
        )
    role = UserRole(body.role.value)
    user = User(
        phone=phone,
        password_hash=hash_password(body.password),
        role=role,
        full_name=body.full_name.strip(),
        tos_accepted_at=datetime.now(UTC),
        last_active_at=datetime.now(UTC),
    )
    db.add(user)
    await db.flush()
    if role == UserRole.WORKER:
        db.add(WorkerProfile(user_id=user.id))
    else:
        name = (body.business_name or body.full_name).strip()
        db.add(Business(owner_user_id=user.id, name=name, status=BusinessStatus.PENDING))
        await notify(
            db,
            user_id=user.id,
            kind=NotificationKind.ACCOUNT,
            title="Business pending approval",
            body="Your company is waiting for Staffbro admin review. You can post jobs after approval.",
            entity_type="business",
            entity_id=user.id,
        )
    await track(db, kind=UsageEventKind.REGISTER, actor_user_id=user.id, entity_type="user", entity_id=user.id)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(user_id=user.id, role=user.role.value)
    return TokenOut(access_token=token, user=await _user_out(db, user))


async def login(db: AsyncSession, body: LoginIn) -> TokenOut:
    phone = normalize_pk_phone(body.phone)
    user = (await db.execute(select(User).where(User.phone == phone))).scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_CREDENTIALS", "message": "Phone or password is incorrect."},
        )
    if user.is_suspended:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "ACCOUNT_SUSPENDED", "message": "This account is suspended."},
        )
    user.last_active_at = datetime.now(UTC)
    await track(db, kind=UsageEventKind.LOGIN, actor_user_id=user.id, entity_type="user", entity_id=user.id)
    await db.commit()
    await db.refresh(user)
    token = create_access_token(user_id=user.id, role=user.role.value)
    return TokenOut(access_token=token, user=await _user_out(db, user))
