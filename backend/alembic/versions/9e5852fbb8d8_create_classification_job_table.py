"""create post and comment table

Revision ID: 9e5852fbb8d8
Revises: 4dbae3c352ae
Create Date: 2026-01-15 21:27:46.719440

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import func
from sqlalchemy.dialects.postgresql import JSONB

# revision identifiers, used by Alembic.
revision: str = "9e5852fbb8d8"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "classification_jobs",
        sa.Column("id", sa.Uuid, primary_key=True, nullable=False),
        sa.Column("submitted_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("title", sa.Text, nullable=True),
        sa.Column("text_content", sa.Text, nullable=True),
        sa.Column("author", JSONB, nullable=False),
        sa.Column("comments", JSONB, nullable=True),
        sa.Column(
            "status",
            sa.Enum("SUBMITTED", "IN_PROGRESS", "COMPLETED", name="jobstatus"),
            nullable=False,
            server_default="SUBMITTED",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("classification_jobs")
    op.execute("DROP TYPE jobstatus")
