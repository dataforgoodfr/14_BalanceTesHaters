"""create post and comment table

Revision ID: 9e5852fbb8d8
Revises: 4dbae3c352ae
Create Date: 2026-01-15 21:27:46.719440

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import func

# revision identifiers, used by Alembic.
revision: str = "9e5852fbb8d8"
down_revision: Union[str, Sequence[str], None] = "4dbae3c352ae"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "posts",
        sa.Column("id", sa.Uuid, primary_key=True, nullable=False),
        sa.Column("url", sa.String, nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at_str", sa.String, nullable=True),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("text_content", sa.Text, nullable=False),
        sa.Column("post_id", sa.String, nullable=False),
        sa.Column("social_network", sa.String, nullable=False),
        sa.Column("author_id", sa.Uuid, sa.ForeignKey("authors.id"), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
        ),
    )
    op.create_table(
        "comments",
        sa.Column("id", sa.Uuid, primary_key=True, nullable=False),
        sa.Column("text_content", sa.Text, nullable=False),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at_str", sa.String, nullable=True),
        sa.Column("scraped_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("screenshot_data", sa.Text, nullable=False),
        sa.Column("nb_likes", sa.Integer, nullable=False),
        sa.Column("classification", sa.String, nullable=True),
        sa.Column("classified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
        ),
        sa.Column("post_id", sa.Uuid, sa.ForeignKey("posts.id"), nullable=True),
        sa.Column(
            "parent_comment_id", sa.Uuid, sa.ForeignKey("comments.id"), nullable=True
        ),
        sa.Column("author_id", sa.Uuid, sa.ForeignKey("authors.id"), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("comments")
    op.drop_table("posts")
