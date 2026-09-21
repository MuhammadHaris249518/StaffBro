import uuid
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import EmploymentType
from app.modules.workers.schemas import SkillRef


class JobStatusIn(str, Enum):
    OPEN = "OPEN"
    CLOSED = "CLOSED"
    FILLED = "FILLED"


class JobWriteIn(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    description: str = Field(min_length=8, max_length=2000)
    salary_min: int = Field(ge=0, le=10_000_000)
    salary_max: int = Field(ge=0, le=10_000_000)
    location_label: str | None = Field(default=None, min_length=2, max_length=160)
    location_id: uuid.UUID | None = None
    profession_id: uuid.UUID
    employment_type: EmploymentType
    skill_ids: list[uuid.UUID] = Field(default_factory=list, max_length=20)


class JobPatchIn(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    description: str | None = Field(default=None, min_length=8, max_length=2000)
    salary_min: int | None = Field(default=None, ge=0, le=10_000_000)
    salary_max: int | None = Field(default=None, ge=0, le=10_000_000)
    location_label: str | None = Field(default=None, min_length=2, max_length=160)
    location_id: uuid.UUID | None = None
    profession_id: uuid.UUID | None = None
    employment_type: EmploymentType | None = None
    skill_ids: list[uuid.UUID] | None = Field(default=None, max_length=20)
    status: JobStatusIn | None = None


class JobOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    business_id: uuid.UUID
    business_name: str
    business_status: str
    business_approved: bool
    title: str
    description: str
    salary_min: int
    salary_max: int
    location_id: uuid.UUID | None = None
    location_label: str
    profession_id: uuid.UUID | None = None
    profession_name_en: str | None = None
    profession_name_ur: str | None = None
    employment_type: str
    status: str
    skills: list[SkillRef] = Field(default_factory=list)
    share_path: str
    created_at: datetime
    updated_at: datetime
