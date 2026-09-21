import uuid

from pydantic import BaseModel, ConfigDict


class ApplyIn(BaseModel):
    job_id: uuid.UUID


class DirectHireIn(BaseModel):
    job_id: uuid.UUID
    worker_id: uuid.UUID


class CandidacyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    job_id: uuid.UUID
    job_title: str
    business_name: str
    business_approved: bool
    worker_id: uuid.UUID
    worker_name: str
    worker_headline: str | None = None
    status: str
    source: str
    contact_phone: str | None = None
    can_accept: bool = False
    can_decline: bool = False
