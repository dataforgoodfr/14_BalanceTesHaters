from datetime import datetime
from uuid import UUID

from balanceteshaters.model.base import ClassificationJob, JobStatus
from sqlalchemy.ext.asyncio import AsyncSession


def create_job(
    session: AsyncSession,
    submitted_at: datetime,
    title: str | None,
    text_content: str | None,
    status: JobStatus,
    author: dict | None,
    comments: list | None,
):
    job = ClassificationJob(
        submitted_at=submitted_at,
        title=title,
        text_content=text_content,
        author=author,
        comments=comments,
        status=status,
    )
    session.add(job)
    return job


async def find_by_id(session: AsyncSession, job_id: UUID) -> ClassificationJob | None:
    return await session.get(ClassificationJob, job_id)


async def update_job_status(
    session: AsyncSession, job_id: UUID, status: JobStatus
) -> ClassificationJob | None:
    classification_job = await find_by_id(session, job_id)
    if not classification_job:
        return None
    classification_job.status = status
    return classification_job


async def update_job_result(
    session: AsyncSession, job_id: UUID, result: dict
) -> ClassificationJob | None:
    classification_job = await find_by_id(session, job_id)
    if not classification_job:
        return None
    classification_job.result = result
    return classification_job
