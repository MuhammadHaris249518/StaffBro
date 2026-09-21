from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.modules.auth.models import User
from app.modules.verification.schemas import PhoneConfirmIn, PhoneConfirmOut, PhoneStartOut
from app.modules.verification.service import confirm_phone, start_phone

router = APIRouter()


@router.post("/phone/start", response_model=PhoneStartOut)
async def start_phone_route(
    user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)
) -> PhoneStartOut:
    return await start_phone(db, user)


@router.post("/phone/confirm", response_model=PhoneConfirmOut)
async def confirm_phone_route(
    body: PhoneConfirmIn,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PhoneConfirmOut:
    return await confirm_phone(db, user, body.code)
