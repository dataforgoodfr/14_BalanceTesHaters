import uuid
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID as UUID_Type

from sqlalchemy import DateTime, func
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped
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
