import datetime
from uuid import UUID

from balanceteshaters.model.base import JobStatus
from pydantic import BaseModel, Field


class Author(BaseModel):
    name: str
    account_href: str


class Comment(BaseModel):
    id: str
    author: Author
    text_content: str
    replies: list["Comment"] = []


class ClassificationJob(BaseModel):
    title: str | None = None
    author: Author
    text_content: str | None = None
    comments: list[Comment] = []


class CommentClassificationResult(BaseModel):
    classification: list[str]
    hate_score: float = Field(ge=0, le=1)
    classified_at: datetime.datetime


class ClassificationJobResult(BaseModel):
    id: UUID
    comments: dict[str, CommentClassificationResult] | None
    status: JobStatus
