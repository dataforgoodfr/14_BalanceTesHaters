from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from backend.balanceteshaters.model.base import ClassificationJob, JobStatus


def create_job(
    session: AsyncSession,
    submited_at: datetime,
    title: str | None,
    text_content: str | None,
    status: JobStatus,
    comments: dict | None,
):
    job = ClassificationJob(
        submitedAt=submited_at,
        title=title,
        textContent=text_content,
        comments=comments,
        status=status,
    )
    session.add(job)
    return job


async def find_by_id(session: AsyncSession, job_id: str) -> ClassificationJob | None:
    result = await session.get(ClassificationJob, job_id)
    return result.scalar()


async def update_job_status(
    session: AsyncSession, job_id: str, status: JobStatus
) -> ClassificationJob | None:
    classification_job = await find_by_id(session, job_id)
    if not classification_job:
        return None
    classification_job.status = status
    return classification_job
