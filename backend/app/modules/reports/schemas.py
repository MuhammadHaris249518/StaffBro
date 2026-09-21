import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import UsageEventKind


class TrackEventIn(BaseModel):
    kind: UsageEventKind
    entity_type: str | None = Field(default=None, max_length=40)
    entity_id: uuid.UUID | None = None


class UsageEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    kind: UsageEventKind
    created_at: datetime


class AnalyticsOut(BaseModel):
    workers_total: int
    workers_available: int
    businesses_total: int
    businesses_approved: int
    businesses_pending: int
    jobs_total: int
    jobs_open: int
    jobs_closed: int
    jobs_filled: int
    applications_total: int
    hires_total: int
    direct_hires_total: int
    active_users_7d: int
    application_to_hire_rate: float
    job_to_hire_rate: float
    events: dict[str, int]
