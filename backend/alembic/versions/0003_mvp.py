"""MVP tables: profiles, job skills, notifications, verification, admin audit, metrics.

Revision ID: 0003_mvp
Revises: 0002_prototype
Create Date: 2026-09-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0003_mvp"
down_revision: str | None = "0002_prototype"
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def _recreate_enum(name: str, values: Sequence[str], table: str, column: str) -> None:
    old = f"{name}_old"
    op.execute(sa.text(f'ALTER TYPE {name} RENAME TO {old}'))
    value_sql = ", ".join(f"'{v}'" for v in values)
    op.execute(sa.text(f"CREATE TYPE {name} AS ENUM ({value_sql})"))
    op.execute(
        sa.text(
            f"ALTER TABLE {table} ALTER COLUMN {column} TYPE {name} USING {column}::text::{name}"
        )
    )
    op.execute(sa.text(f"DROP TYPE {old}"))


def upgrade() -> None:
    _recreate_enum("business_status", ("PENDING", "ACTIVE", "REJECTED"), "businesses", "status")
    _recreate_enum("job_status", ("OPEN", "CLOSED", "FILLED"), "jobs", "status")
    _recreate_enum(
        "candidacy_status",
        ("APPLIED", "IN_REVIEW", "OFFERED", "HIRED", "REJECTED"),
        "candidacies",
        "status",
    )

    employment_type = postgresql.ENUM(
        "FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY", name="employment_type"
    )
    employment_type.create(op.get_bind(), checkfirst=True)
    availability = postgresql.ENUM("AVAILABLE", "BUSY", "NOT_LOOKING", name="availability")
    availability.create(op.get_bind(), checkfirst=True)
    business_type = postgresql.ENUM("RESTAURANT", "HOTEL", "GROCERY", name="business_type")
    business_type.create(op.get_bind(), checkfirst=True)
    notification_kind = postgresql.ENUM(
        "APPLICATION_RECEIVED",
        "APPLICATION_STATUS",
        "HIRED",
        "DIRECT_OFFER",
        "BUSINESS_APPROVED",
        "BUSINESS_REJECTED",
        "ACCOUNT",
        name="notification_kind",
    )
    notification_kind.create(op.get_bind(), checkfirst=True)
    usage_event_kind = postgresql.ENUM(
        "REGISTER",
        "LOGIN",
        "JOB_POST",
        "APPLICATION",
        "PROFILE_VIEW",
        "DIRECT_OFFER",
        "HIRE",
        "CONTACT",
        name="usage_event_kind",
    )
    usage_event_kind.create(op.get_bind(), checkfirst=True)
    audit_action = postgresql.ENUM(
        "BUSINESS_APPROVE",
        "BUSINESS_REJECT",
        "USER_SUSPEND",
        "USER_UNSUSPEND",
        "JOB_CLOSE",
        "JOB_REOPEN",
        name="audit_action",
    )
    audit_action.create(op.get_bind(), checkfirst=True)

    op.add_column("users", sa.Column("phone_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("last_active_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column(
        "businesses",
        sa.Column(
            "business_type",
            postgresql.ENUM("RESTAURANT", "HOTEL", "GROCERY", name="business_type", create_type=False),
            nullable=True,
        ),
    )
    op.add_column("businesses", sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("businesses", sa.Column("location_label", sa.String(160), nullable=True))
    op.add_column("businesses", sa.Column("description", sa.String(1000), nullable=True))
    op.add_column("businesses", sa.Column("rejected_reason", sa.Text(), nullable=True))
    op.add_column("businesses", sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("businesses", sa.Column("reviewed_by_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key("fk_businesses_location_id", "businesses", "locations", ["location_id"], ["id"])
    op.create_foreign_key("fk_businesses_reviewed_by_id", "businesses", "users", ["reviewed_by_id"], ["id"])

    op.add_column("worker_profiles", sa.Column("bio", sa.String(500), nullable=True))
    op.add_column("worker_profiles", sa.Column("profession_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("worker_profiles", sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column("worker_profiles", sa.Column("experience_years", sa.Integer(), nullable=True))
    op.add_column("worker_profiles", sa.Column("expected_salary", sa.Integer(), nullable=True))
    op.add_column(
        "worker_profiles",
        sa.Column(
            "availability",
            postgresql.ENUM("AVAILABLE", "BUSY", "NOT_LOOKING", name="availability", create_type=False),
            nullable=False,
            server_default="AVAILABLE",
        ),
    )
    op.add_column(
        "worker_profiles",
        sa.Column(
            "employment_type",
            postgresql.ENUM(
                "FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY", name="employment_type", create_type=False
            ),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_worker_profiles_profession_id", "worker_profiles", "professions", ["profession_id"], ["id"]
    )
    op.create_foreign_key("fk_worker_profiles_location_id", "worker_profiles", "locations", ["location_id"], ["id"])

    op.add_column("jobs", sa.Column("location_id", postgresql.UUID(as_uuid=True), nullable=True))
    op.add_column(
        "jobs",
        sa.Column(
            "employment_type",
            postgresql.ENUM(
                "FULL_TIME", "PART_TIME", "CONTRACT", "TEMPORARY", name="employment_type", create_type=False
            ),
            nullable=False,
            server_default="FULL_TIME",
        ),
    )
    op.create_foreign_key("fk_jobs_location_id", "jobs", "locations", ["location_id"], ["id"])

    op.create_table(
        "worker_skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("worker_profile_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("worker_profiles.id"), nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("skills.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("worker_profile_id", "skill_id", name="uq_worker_skills_profile_skill"),
    )
    op.create_index("ix_worker_skills_worker_profile_id", "worker_skills", ["worker_profile_id"])

    op.create_table(
        "job_skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("job_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("jobs.id"), nullable=False),
        sa.Column("skill_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("skills.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id", "skill_id", name="uq_job_skills_job_skill"),
    )
    op.create_index("ix_job_skills_job_id", "job_skills", ["job_id"])

    op.create_table(
        "notifications",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM(
                "APPLICATION_RECEIVED",
                "APPLICATION_STATUS",
                "HIRED",
                "DIRECT_OFFER",
                "BUSINESS_APPROVED",
                "BUSINESS_REJECTED",
                "ACCOUNT",
                name="notification_kind",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("title", sa.String(160), nullable=False),
        sa.Column("body", sa.String(400), nullable=False),
        sa.Column("entity_type", sa.String(40), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_read", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notifications_user_id", "notifications", ["user_id"])

    op.create_table(
        "phone_challenges",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("code_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("attempts", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_phone_challenges_user_id", "phone_challenges", ["user_id"])

    op.create_table(
        "admin_audit_logs",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("admin_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column(
            "action",
            postgresql.ENUM(
                "BUSINESS_APPROVE",
                "BUSINESS_REJECT",
                "USER_SUSPEND",
                "USER_UNSUSPEND",
                "JOB_CLOSE",
                "JOB_REOPEN",
                name="audit_action",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("target_type", sa.String(40), nullable=False),
        sa.Column("target_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_admin_audit_logs_admin_user_id", "admin_audit_logs", ["admin_user_id"])

    op.create_table(
        "usage_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM(
                "REGISTER",
                "LOGIN",
                "JOB_POST",
                "APPLICATION",
                "PROFILE_VIEW",
                "DIRECT_OFFER",
                "HIRE",
                "CONTACT",
                name="usage_event_kind",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("actor_user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("entity_type", sa.String(40), nullable=True),
        sa.Column("entity_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_usage_events_kind", "usage_events", ["kind"])
    op.create_index("ix_usage_events_actor_user_id", "usage_events", ["actor_user_id"])


def downgrade() -> None:
    op.drop_table("usage_events")
    op.drop_table("admin_audit_logs")
    op.drop_table("phone_challenges")
    op.drop_table("notifications")
    op.drop_table("job_skills")
    op.drop_table("worker_skills")
    op.drop_constraint("fk_jobs_location_id", "jobs", type_="foreignkey")
    op.drop_column("jobs", "employment_type")
    op.drop_column("jobs", "location_id")
    op.drop_constraint("fk_worker_profiles_location_id", "worker_profiles", type_="foreignkey")
    op.drop_constraint("fk_worker_profiles_profession_id", "worker_profiles", type_="foreignkey")
    op.drop_column("worker_profiles", "employment_type")
    op.drop_column("worker_profiles", "availability")
    op.drop_column("worker_profiles", "expected_salary")
    op.drop_column("worker_profiles", "experience_years")
    op.drop_column("worker_profiles", "location_id")
    op.drop_column("worker_profiles", "profession_id")
    op.drop_column("worker_profiles", "bio")
    op.drop_constraint("fk_businesses_reviewed_by_id", "businesses", type_="foreignkey")
    op.drop_constraint("fk_businesses_location_id", "businesses", type_="foreignkey")
    op.drop_column("businesses", "reviewed_by_id")
    op.drop_column("businesses", "reviewed_at")
    op.drop_column("businesses", "rejected_reason")
    op.drop_column("businesses", "description")
    op.drop_column("businesses", "location_label")
    op.drop_column("businesses", "location_id")
    op.drop_column("businesses", "business_type")
    op.drop_column("users", "last_active_at")
    op.drop_column("users", "phone_verified_at")
    sa.Enum(name="audit_action").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="usage_event_kind").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="notification_kind").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="business_type").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="availability").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="employment_type").drop(op.get_bind(), checkfirst=True)
    _recreate_enum("candidacy_status", ("APPLIED", "HIRED", "REJECTED"), "candidacies", "status")
    _recreate_enum("job_status", ("OPEN", "CLOSED"), "jobs", "status")
    _recreate_enum("business_status", ("ACTIVE",), "businesses", "status")
