import uuid
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID as UUID_Type

from balanceteshaters.model.base import Base
from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, relationship
from sqlalchemy.testing.schema import mapped_column


@dataclass
class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID_Type] = mapped_column(primary_key=True, insert_default=uuid.uuid7)
    email: Mapped[str] = mapped_column(unique=True, nullable=False)
    login: Mapped[str] = mapped_column(unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(nullable=True)
    display_name: Mapped[str] = mapped_column(nullable=True)
    enabled: Mapped[bool] = mapped_column(nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), onupdate=func.now()
    )
    auth_tokens: Mapped[list["AuthToken"]] = relationship(
        "AuthToken", back_populates="user", cascade="all, delete-orphan"
    )


class AuthToken(Base):
    __tablename__ = "auth_tokens"

    id: Mapped[UUID_Type] = mapped_column(primary_key=True, insert_default=uuid.uuid7)
    user_id: Mapped[UUID_Type] = mapped_column(ForeignKey("users.id"), nullable=False)

    jwt_token: Mapped[str] = mapped_column(unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    user: Mapped[User] = relationship(back_populates="auth_tokens")
