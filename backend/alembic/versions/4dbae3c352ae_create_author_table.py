"""create author table

Revision ID: 4dbae3c352ae
Revises:
Create Date: 2026-01-14 22:05:49.894895

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.sql import func

# revision identifiers, used by Alembic.
revision: str = "4dbae3c352ae"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        "authors",
        sa.Column("id", sa.Uuid, primary_key=True, nullable=False),
        sa.Column("name", sa.String, unique=True, nullable=False),
        sa.Column("account_href", sa.String, unique=True, nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table("authors")
