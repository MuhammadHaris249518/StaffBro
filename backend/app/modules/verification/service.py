import hashlib
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.enums import NotificationKind
from app.core.http import conflict, unprocessable
from app.modules.auth.models import User
from app.modules.notifications.service import notify
from app.modules.verification.models import PhoneChallenge
from app.modules.verification.schemas import PhoneConfirmOut, PhoneStartOut


def hash_otp(code: str) -> str:
    return hashlib.sha256(f"{settings.jwt_secret}:{code}".encode()).hexdigest()


async def start_phone(db: AsyncSession, user: User) -> PhoneStartOut:
    if user.phone_verified_at is not None:
        conflict("ALREADY_VERIFIED", "This phone is already verified.")
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(
        PhoneChallenge(
            user_id=user.id,
            code_hash=hash_otp(code),
            expires_at=datetime.now(UTC) + timedelta(minutes=10),
        )
    )
    await db.commit()
    debug = code if settings.app_env == "local" else None
    return PhoneStartOut(debug_code=debug)


async def confirm_phone(db: AsyncSession, user: User, code: str) -> PhoneConfirmOut:
    if user.phone_verified_at is not None:
        return PhoneConfirmOut(phone_verified=True)
    row = (
        await db.execute(
            select(PhoneChallenge)
            .where(PhoneChallenge.user_id == user.id, PhoneChallenge.consumed_at.is_(None))
            .order_by(PhoneChallenge.created_at.desc())
        )
    ).scalars().first()
    if row is None:
        unprocessable("NO_CHALLENGE", "Request a verification code first.")
    if row.expires_at < datetime.now(UTC):
        unprocessable("CODE_EXPIRED", "This code expired. Request a new one.")
    if row.attempts >= 5:
        unprocessable("TOO_MANY_ATTEMPTS", "Too many attempts. Request a new code.")
    row.attempts += 1
    if row.code_hash != hash_otp(code.strip()):
        await db.commit()
        unprocessable("INVALID_CODE", "That code is incorrect.")
    row.consumed_at = datetime.now(UTC)
    user.phone_verified_at = datetime.now(UTC)
    await notify(
        db,
        user_id=user.id,
        kind=NotificationKind.ACCOUNT,
        title="Phone verified",
        body="Your phone number is now verified on Staffbro.",
        entity_type="user",
        entity_id=user.id,
    )
    await db.commit()
    return PhoneConfirmOut(phone_verified=True)
