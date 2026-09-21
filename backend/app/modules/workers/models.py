import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.enums import Availability, EmploymentType
from app.core.models_base import TimestampMixin, UUIDPrimaryKeyMixin


class WorkerProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "worker_profiles"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False
    )
    headline: Mapped[str | None] = mapped_column(String(160), nullable=True)
    bio: Mapped[str | None] = mapped_column(String(500), nullable=True)
    profession_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("professions.id"), nullable=True
    )
    location_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("locations.id"), nullable=True
    )
    experience_years: Mapped[int | None] = mapped_column(Integer, nullable=True)
    expected_salary: Mapped[int | None] = mapped_column(Integer, nullable=True)
    availability: Mapped[Availability] = mapped_column(
        Enum(Availability, name="availability", native_enum=True, create_type=False),
        nullable=False,
        default=Availability.AVAILABLE,
    )
    employment_type: Mapped[EmploymentType | None] = mapped_column(
        Enum(EmploymentType, name="employment_type", native_enum=True, create_type=False),
        nullable=True,
    )


class WorkerSkill(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "worker_skills"
    __table_args__ = (UniqueConstraint("worker_profile_id", "skill_id", name="uq_worker_skills_profile_skill"),)

    worker_profile_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("worker_profiles.id"), nullable=False, index=True
    )
    skill_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("skills.id"), nullable=False)
