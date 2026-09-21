import enum
import uuid

from sqlalchemy import Enum, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base
from app.core.models_base import TimestampMixin, UUIDPrimaryKeyMixin


class CandidacyStatus(str, enum.Enum):
    APPLIED = "APPLIED"
    IN_REVIEW = "IN_REVIEW"
    OFFERED = "OFFERED"
    HIRED = "HIRED"
    REJECTED = "REJECTED"


class CandidacySource(str, enum.Enum):
    APPLY = "APPLY"
    DIRECT_HIRE = "DIRECT_HIRE"


class Candidacy(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "candidacies"
    __table_args__ = (UniqueConstraint("job_id", "worker_user_id", name="uq_candidacies_job_worker"),)

    job_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("jobs.id"), nullable=False, index=True)
    worker_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True
    )
    status: Mapped[CandidacyStatus] = mapped_column(
        Enum(CandidacyStatus, name="candidacy_status", native_enum=True, create_type=False),
        nullable=False,
        default=CandidacyStatus.APPLIED,
    )
    source: Mapped[CandidacySource] = mapped_column(
        Enum(CandidacySource, name="candidacy_source", native_enum=True, create_type=False),
        nullable=False,
        default=CandidacySource.APPLY,
    )
