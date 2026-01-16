import uuid
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID as UUID_Type

from sqlalchemy import DateTime, ForeignKey, func
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
    posts: Mapped[list["Post"]] = relationship(
        "Post", back_populates="author", cascade="all, delete-orphan"
    )


@dataclass
class Post(Base):
    __tablename__ = "posts"

    id: Mapped[UUID_Type] = mapped_column(primary_key=True, insert_default=uuid.uuid7)
    url: Mapped[str] = mapped_column(unique=True, nullable=False)
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    text_content: Mapped[str] = mapped_column(nullable=False)
    post_id: Mapped[str] = mapped_column(unique=True, nullable=False)
    social_network: Mapped[str] = mapped_column(nullable=False)
    author: Mapped[Author] = relationship(Author, back_populates="posts")
    author_id: Mapped[UUID_Type] = mapped_column(
        ForeignKey("authors.id"), nullable=False
    )
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
    published_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    scraped_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    screenshot_data: Mapped[str] = mapped_column(nullable=False)
    nb_likes: Mapped[int] = mapped_column(nullable=False)
    classification: Mapped[str] = mapped_column(nullable=True)
    classified_at: Mapped[datetime] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    post_id: Mapped[UUID_Type] = mapped_column(ForeignKey("posts.id"), nullable=False)
    post: Mapped[Post] = relationship("Post", back_populates="comments")
    parent_comment_id: Mapped[UUID_Type] = mapped_column(
        ForeignKey("comments.id"), nullable=True
    )
    parent_comment: Mapped["Comment"] = relationship(
        "Comment", back_populates="replies", remote_side=[id]
    )
    replies: Mapped[list["Comment"]] = relationship(
        "Comment", back_populates="parent_comment", cascade="all, delete-orphan"
    )
