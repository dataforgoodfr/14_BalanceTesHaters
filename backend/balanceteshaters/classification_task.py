import logging
from uuid import UUID

from balanceteshaters.infra.database import Database
from balanceteshaters.model.base import JobStatus
from balanceteshaters.model.repositories import (
    classification_job as classification_job_repository,
)


class ClassificationTask:
    def __init__(self, db: Database):
        self.logger = logging.getLogger(
            f"{__name__}.{self.__class__.__name__}",
        )
        self.db = db

    async def classify(self, job_id: UUID):
        await self.update_job_status(job_id, JobStatus.IN_PROGRESS)
        job = await self.get_job(job_id)
        if not job:
            self.logger.error(f"Classification job with id {job_id} not found")
            await self.update_job_status(job_id, JobStatus.FAILED)
            return
        # TODO: comment classification logic here
        await self.update_job_status(job_id, JobStatus.COMPLETED)

    async def get_job(self, job_id: UUID):
        async with self.db.get_session() as session, session.begin():
            classification_job = await classification_job_repository.find_by_id(
                session, job_id
            )
            if not classification_job:
                self.logger.error(f"Classification job with id {job_id} not found")
                return None
            return classification_job

    async def update_job_status(self, job_id: UUID, status: JobStatus):
        async with self.db.get_session() as session, session.begin():
            classification_job = await classification_job_repository.update_job_status(
                session, job_id, status
            )
            if not classification_job:
                self.logger.error(f"Classification job with id {job_id} not found")
                return None
            await session.commit()
            return classification_job
