"""create auth_tokens table

Revision ID: c03093f70e3e
Revises: 006fa040d28a
Create Date: 2025-11-28 22:03:36.588420

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.sql import func

# revision identifiers, used by Alembic.
revision: str = "c03093f70e3e"
down_revision: Union[str, Sequence[str], None] = "006fa040d28a"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "auth_tokens",
        sa.Column(
            "id",
            sa.Uuid(),
            primary_key=True,
            index=True,
        ),
        sa.Column("jwt_token", sa.String(), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "user_id",
            sa.Uuid(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
        ),
    )


def downgrade() -> None:
    op.drop_table("auth_tokens")
