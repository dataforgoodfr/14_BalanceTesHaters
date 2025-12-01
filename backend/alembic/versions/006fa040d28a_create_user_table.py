"""create user table

Revision ID: 006fa040d28a
Revises: 
Create Date: 2025-11-27 21:49:33.284079

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import func


# revision identifiers, used by Alembic.
revision: str = '006fa040d28a'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column(
            "id",
            sa.Uuid(),
            primary_key=True,
            index=True,
        ),
        sa.Column("email", sa.String(), nullable=False, unique=True),
        sa.Column("login", sa.String(), nullable=False, unique=True),
        sa.Column("password_hash", sa.String(), nullable=True),
        sa.Column("display_name", sa.String(), nullable=True),
        sa.Column("enabled", sa.Boolean(), nullable=False, default=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
        ),
        sa.Column("updated_at", sa.DateTime(timezone=True), onupdate=func.now()),
    )


def downgrade() -> None:
    op.drop_table("users")