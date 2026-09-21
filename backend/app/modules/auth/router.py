from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.core.security import get_current_user
from app.modules.auth.models import User
from app.modules.auth.schemas import LoginIn, MeOut, RegisterIn, TokenOut
from app.modules.auth.service import login, me, register

router = APIRouter()


@router.post("/register", response_model=TokenOut)
async def register_route(body: RegisterIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    return await register(db, body)


@router.post("/login", response_model=TokenOut)
async def login_route(body: LoginIn, db: AsyncSession = Depends(get_db)) -> TokenOut:
    return await login(db, body)


@router.get("/me", response_model=MeOut)
async def me_route(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)) -> MeOut:
    return await me(db, user)
