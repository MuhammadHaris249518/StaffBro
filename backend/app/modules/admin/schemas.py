import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.modules.reports.schemas import AnalyticsOut


class RejectBusinessIn(BaseModel):
    reason: str = Field(min_length=3, max_length=400)


class AdminUserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str
    role: str
    is_suspended: bool
    phone_verified: bool
    last_active_at: datetime | None = None
    created_at: datetime


class AdminBusinessOut(BaseModel):
    id: uuid.UUID
    name: str
    status: str
    business_type: str | None = None
    location_label: str | None = None
    description: str | None = None
    owner_name: str
    owner_phone: str
    created_at: datetime


class AdminJobOut(BaseModel):
    id: uuid.UUID
    title: str
    business_name: str
    status: str
    location_label: str
    created_at: datetime


class AdminCandidacyOut(BaseModel):
    id: uuid.UUID
    job_title: str
    worker_name: str
    business_name: str
    status: str
    source: str
    created_at: datetime


class AuditOut(BaseModel):
    id: uuid.UUID
    admin_user_id: uuid.UUID
    action: str
    target_type: str
    target_id: uuid.UUID | None = None
    note: str | None = None
    created_at: datetime


class DashboardOut(BaseModel):
    analytics: AnalyticsOut
    pending_businesses: int
    suspended_users: int
