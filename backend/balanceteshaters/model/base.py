from dataclasses import dataclass
from datetime import datetime
from enum import Enum
from uuid import UUID as UUID_Type

import sqlalchemy
from sqlalchemy import DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped
from sqlalchemy.testing.schema import mapped_column
from uuid_extensions import uuid7


@dataclass
class Base(AsyncAttrs, DeclarativeBase):
    pass


class JobStatus(Enum):
    SUBMITTED = "SUBMITTED"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class ClassificationJob(Base):
    __tablename__ = "classification_jobs"

    id: Mapped[UUID_Type] = mapped_column(primary_key=True, insert_default=uuid7)
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    title: Mapped[str] = mapped_column(nullable=True)
    text_content: Mapped[str] = mapped_column(nullable=True)
    author: Mapped[dict] = mapped_column(JSONB, nullable=False)
    comments: Mapped[list] = mapped_column(JSONB, nullable=True)
    status: Mapped[JobStatus] = mapped_column(
        sqlalchemy.Enum(JobStatus), nullable=False, default=JobStatus.SUBMITTED
    )
    result: Mapped[dict] = mapped_column(JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
