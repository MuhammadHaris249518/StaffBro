import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field


class RoleIn(str, Enum):
    WORKER = "WORKER"
    BUSINESS = "BUSINESS"


class RegisterIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=10, max_length=20)
    password: str = Field(min_length=8, max_length=128)
    role: RoleIn
    tos_accepted: bool
    business_name: str | None = Field(default=None, max_length=160)


class LoginIn(BaseModel):
    phone: str = Field(min_length=10, max_length=20)
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    phone: str
    role: str
    full_name: str
    phone_verified: bool = False
    business_id: uuid.UUID | None = None
    business_name: str | None = None
    business_status: str | None = None


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MeOut(UserOut):
    tos_accepted_at: datetime | None = None
    unread_notifications: int = 0
