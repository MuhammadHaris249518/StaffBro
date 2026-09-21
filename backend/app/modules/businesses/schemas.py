import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import BusinessType


class BusinessUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=160)
    business_type: BusinessType | None = None
    location_id: uuid.UUID | None = None
    location_label: str | None = Field(default=None, max_length=160)
    description: str | None = Field(default=None, max_length=1000)


class BusinessOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_user_id: uuid.UUID
    owner_name: str
    owner_phone: str | None = None
    name: str
    status: str
    business_type: str | None = None
    location_id: uuid.UUID | None = None
    location_label: str | None = None
    description: str | None = None
    rejected_reason: str | None = None
    phone_verified: bool = False
    created_at: datetime
