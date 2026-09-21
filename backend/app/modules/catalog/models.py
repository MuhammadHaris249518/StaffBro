import enum
import uuid

from sqlalchemy import Boolean, CheckConstraint, Enum, Float, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.db import Base
from app.core.models_base import TimestampMixin, UUIDPrimaryKeyMixin


class LocationLevel(str, enum.Enum):
    COUNTRY = "COUNTRY"
    PROVINCE = "PROVINCE"
    CITY = "CITY"
    AREA = "AREA"


class Location(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "locations"
    __table_args__ = (
        UniqueConstraint("parent_id", "slug", name="uq_locations_parent_slug"),
        Index("ix_locations_parent_id", "parent_id"),
        CheckConstraint("level IN ('COUNTRY','PROVINCE','CITY','AREA')", name="ck_locations_level"),
    )

    parent_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("locations.id"), nullable=True)
    level: Mapped[LocationLevel] = mapped_column(
        Enum(LocationLevel, name="location_level", native_enum=True, create_type=False),
        nullable=False,
    )
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    name_ur: Mapped[str] = mapped_column(String(120), nullable=False)
    slug: Mapped[str] = mapped_column(String(120), nullable=False)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    parent: Mapped["Location | None"] = relationship(remote_side="Location.id")


class Profession(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "professions"
    __table_args__ = (Index("ix_professions_aliases", "aliases", postgresql_using="gin"),)

    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    name_ur: Mapped[str] = mapped_column(String(120), nullable=False)
    aliases: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    skills: Mapped[list["Skill"]] = relationship(back_populates="profession")


class Skill(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "skills"
    __table_args__ = (Index("ix_skills_aliases", "aliases", postgresql_using="gin"),)

    profession_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("professions.id"), nullable=True
    )
    slug: Mapped[str] = mapped_column(String(80), unique=True, nullable=False)
    name_en: Mapped[str] = mapped_column(String(120), nullable=False)
    name_ur: Mapped[str] = mapped_column(String(120), nullable=False)
    aliases: Mapped[list[str]] = mapped_column(ARRAY(Text), nullable=False, default=list)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    profession: Mapped[Profession | None] = relationship(back_populates="skills")
