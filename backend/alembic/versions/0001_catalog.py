"""catalogue tables: locations, professions, skills

Revision ID: 0001_catalog
Revises:
Create Date: 2026-09-20
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_catalog"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")

    location_level = postgresql.ENUM("COUNTRY", "PROVINCE", "CITY", "AREA", name="location_level")
    location_level.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "locations",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("parent_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("locations.id"), nullable=True),
        sa.Column("level", postgresql.ENUM("COUNTRY", "PROVINCE", "CITY", "AREA", name="location_level", create_type=False), nullable=False),
        sa.Column("name_en", sa.String(120), nullable=False),
        sa.Column("name_ur", sa.String(120), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False),
        sa.Column("lat", sa.Float(), nullable=True),
        sa.Column("lng", sa.Float(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("parent_id", "slug", name="uq_locations_parent_slug"),
    )
    op.create_index("ix_locations_parent_id", "locations", ["parent_id"])

    op.create_table(
        "professions",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("name_en", sa.String(120), nullable=False),
        sa.Column("name_ur", sa.String(120), nullable=False),
        sa.Column("aliases", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_professions_aliases", "professions", ["aliases"], postgresql_using="gin")

    op.create_table(
        "skills",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("profession_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("professions.id"), nullable=True),
        sa.Column("slug", sa.String(80), nullable=False),
        sa.Column("name_en", sa.String(120), nullable=False),
        sa.Column("name_ur", sa.String(120), nullable=False),
        sa.Column("aliases", postgresql.ARRAY(sa.Text()), server_default="{}", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_skills_aliases", "skills", ["aliases"], postgresql_using="gin")
    op.create_index("ix_skills_profession_id", "skills", ["profession_id"])


def downgrade() -> None:
    op.drop_table("skills")
    op.drop_table("professions")
    op.drop_table("locations")
    sa.Enum(name="location_level").drop(op.get_bind(), checkfirst=True)
    op.execute("DROP EXTENSION IF EXISTS citext")
    op.execute("DROP EXTENSION IF EXISTS pg_trgm")
