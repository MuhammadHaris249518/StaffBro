import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.core.enums import Availability, EmploymentType


class SkillRef(BaseModel):
    id: uuid.UUID
    name_en: str
    name_ur: str
    slug: str


class WorkerProfileUpdateIn(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    headline: str | None = Field(default=None, max_length=160)
    bio: str | None = Field(default=None, max_length=500)
    profession_id: uuid.UUID | None = None
    location_id: uuid.UUID | None = None
    experience_years: int | None = Field(default=None, ge=0, le=40)
    expected_salary: int | None = Field(default=None, ge=0, le=10_000_000)
    availability: Availability | None = None
    employment_type: EmploymentType | None = None
    skill_ids: list[uuid.UUID] | None = Field(default=None, max_length=20)


class WorkerProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    full_name: str
    phone: str | None = None
    phone_verified: bool = False
    headline: str | None = None
    bio: str | None = None
    profession_id: uuid.UUID | None = None
    profession_name_en: str | None = None
    profession_name_ur: str | None = None
    location_id: uuid.UUID | None = None
    location_label: str | None = None
    experience_years: int | None = None
    expected_salary: int | None = None
    availability: str
    employment_type: str | None = None
    skills: list[SkillRef] = Field(default_factory=list)
    completeness: int = 0
    created_at: datetime


class WorkerCardOut(BaseModel):
    id: uuid.UUID
    full_name: str
    headline: str | None = None
    profession_id: uuid.UUID | None = None
    profession_name_en: str | None = None
    profession_name_ur: str | None = None
    location_label: str | None = None
    experience_years: int | None = None
    expected_salary: int | None = None
    availability: str
    employment_type: str | None = None
    phone_verified: bool = False
    skills: list[SkillRef] = Field(default_factory=list)
