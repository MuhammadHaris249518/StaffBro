import uuid
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.core.pagination import Page


class LocationLevelOut(str, Enum):
    COUNTRY = "COUNTRY"
    PROVINCE = "PROVINCE"
    CITY = "CITY"
    AREA = "AREA"


class LocationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    parent_id: uuid.UUID | None
    level: LocationLevelOut
    name_en: str
    name_ur: str
    slug: str
    is_active: bool


class ProfessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    slug: str
    name_en: str
    name_ur: str
    aliases: list[str]
    is_active: bool


class SkillOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    profession_id: uuid.UUID | None
    slug: str
    name_en: str
    name_ur: str
    aliases: list[str]
    is_active: bool


class CatalogListQuery(BaseModel):
    limit: int = Field(default=100, ge=1, le=200)
    cursor: str | None = None


ProfessionPage = Page[ProfessionOut]
SkillPage = Page[SkillOut]
LocationPage = Page[LocationOut]
