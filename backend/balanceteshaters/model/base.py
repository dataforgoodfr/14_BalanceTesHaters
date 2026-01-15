import uuid
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID as UUID_Type

from sqlalchemy import DateTime, func
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, relationship
from sqlalchemy.testing.schema import mapped_column


@dataclass
class Base(AsyncAttrs, DeclarativeBase):
    pass


@dataclass
class Author(Base):
    __tablename__ = "authors"

    id: Mapped[UUID_Type] = mapped_column(primary_key=True, insert_default=uuid.uuid7)
    name: Mapped[str] = mapped_column(unique=True, nullable=False)
    account_href: Mapped[str] = mapped_column(unique=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )


@dataclass
class Post(Base):
    __tablename__ = "posts"

    id: Mapped[UUID_Type] = mapped_column(primary_key=True, insert_default=uuid.uuid7)
    url: Mapped[str] = mapped_column(unique=True, nullable=False)
    published_at: Mapped[datetime] = mapped_column(nullable=False)
    scraped_at: Mapped[datetime] = mapped_column(nullable=False)
    text_content: Mapped[str] = mapped_column(nullable=False)
    post_id: Mapped[str] = mapped_column(unique=True, nullable=False)
    social_network: Mapped[str] = mapped_column(nullable=False)
    author: Mapped[Author] = relationship(Author)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    comments = relationship(
        "Comment", back_populates="post", cascade="all, delete-orphan"
    )


@dataclass
class Comment(Base):
    __tablename__ = "comments"

    id: Mapped[UUID_Type] = mapped_column(primary_key=True, insert_default=uuid.uuid7)
    text_content: Mapped[str] = mapped_column(nullable=False)
    published_at: Mapped[datetime] = mapped_column(nullable=False)
    scraped_at: Mapped[datetime] = mapped_column(nullable=False)
    screenshot_data: Mapped[str] = mapped_column(nullable=False)
    nb_likes: Mapped[int] = mapped_column(nullable=False)
    classification: Mapped[str] = mapped_column(nullable=False)
    classified_at: Mapped[datetime] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    post: Mapped[Post] = relationship("Post", back_populates="comments")
    parent_comment: Mapped["Comment" | None] = relationship(
        "Comment", back_populates="replies", remote_side=[id]
    )
    replies: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="parent_comment", cascade="all, delete-orphan"
    )
