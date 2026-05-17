"""add_ai_usage_events

Revision ID: b7e4c9f3a2d1
Revises: 37cd7b2f8c45
Create Date: 2026-05-16 19:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import app.models.base


revision: str = "b7e4c9f3a2d1"
down_revision: Union[str, Sequence[str], None] = "37cd7b2f8c45"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ai_usage_events",
        sa.Column("business_id", app.models.base.GUID(), nullable=False),
        sa.Column("user_id", app.models.base.GUID(), nullable=False),
        sa.Column("endpoint", sa.String(length=80), nullable=False),
        sa.Column("model", sa.String(length=120), nullable=False),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("prompt_chars", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("response_chars", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("latency_ms", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("error_code", sa.String(length=80), nullable=True),
        sa.Column("id", app.models.base.GUID(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["business_id"], ["businesses.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ai_usage_events_business_id", "ai_usage_events", ["business_id"])
    op.create_index("ix_ai_usage_events_user_id", "ai_usage_events", ["user_id"])
    op.create_index("ix_ai_usage_events_business_created", "ai_usage_events", ["business_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_usage_events_business_created", table_name="ai_usage_events")
    op.drop_index("ix_ai_usage_events_user_id", table_name="ai_usage_events")
    op.drop_index("ix_ai_usage_events_business_id", table_name="ai_usage_events")
    op.drop_table("ai_usage_events")
