"""prototype tables: users, worker_profiles, businesses, jobs, candidacies

Revision ID: 0002_prototype
Revises: 0001_catalog
Create Date: 2026-09-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0002_prototype"
down_revision: str | None = "0001_catalog"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    user_role = postgresql.ENUM("WORKER", "BUSINESS", "ADMIN", name="user_role")
    user_role.create(op.get_bind(), checkfirst=True)
    business_status = postgresql.ENUM("ACTIVE", name="business_status")
    business_status.create(op.get_bind(), checkfirst=True)
    job_status = postgresql.ENUM("OPEN", "CLOSED", name="job_status")
    job_status.create(op.get_bind(), checkfirst=True)
    candidacy_status = postgresql.ENUM("APPLIED", "HIRED", "REJECTED", name="candidacy_status")
    candidacy_status.create(op.get_bind(), checkfirst=True)
    candidacy_source = postgresql.ENUM("APPLY", "DIRECT_HIRE", name="candidacy_source")
    candidacy_source.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("phone", sa.String(16), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", postgresql.ENUM("WORKER", "BUSINESS", "ADMIN", name="user_role", create_type=False), nullable=False),
        sa.Column("full_name", sa.String(120), nullable=False),
        sa.Column("tos_accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_suspended", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("phone"),
    )
    op.create_table(
        "worker_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("headline", sa.String(160), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_table(
        "businesses",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("owner_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("name", sa.String(160), nullable=False),
        sa.Column("status", postgresql.ENUM("ACTIVE", name="business_status", create_type=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("owner_user_id"),
    )
    op.create_table(
        "jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("business_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("businesses.id"), nullable=False),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("description", sa.String(2000), nullable=False),
        sa.Column("salary_min", sa.Integer(), nullable=False),
        sa.Column("salary_max", sa.Integer(), nullable=False),
        sa.Column("location_label", sa.String(160), nullable=False),
        sa.Column("profession_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("professions.id"), nullable=True),
        sa.Column("status", postgresql.ENUM("OPEN", "CLOSED", name="job_status", create_type=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_jobs_business_id", "jobs", ["business_id"])
    op.create_table(
        "candidacies",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("worker_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("status", postgresql.ENUM("APPLIED", "HIRED", "REJECTED", name="candidacy_status", create_type=False), nullable=False),
        sa.Column("source", postgresql.ENUM("APPLY", "DIRECT_HIRE", name="candidacy_source", create_type=False), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id", "worker_user_id", name="uq_candidacies_job_worker"),
    )
    op.create_index("ix_candidacies_job_id", "candidacies", ["job_id"])
    op.create_index("ix_candidacies_worker_user_id", "candidacies", ["worker_user_id"])


def downgrade() -> None:
    op.drop_table("candidacies")
    op.drop_table("jobs")
    op.drop_table("businesses")
    op.drop_table("worker_profiles")
    op.drop_table("users")
    sa.Enum(name="candidacy_source").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="candidacy_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="job_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="business_status").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="user_role").drop(op.get_bind(), checkfirst=True)
