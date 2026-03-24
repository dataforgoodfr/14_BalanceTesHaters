import datetime
import logging
from uuid import UUID

from balanceteshaters.classification.batch_classifier import BatchClassifier
from balanceteshaters.infra.database import Database
from balanceteshaters.model.base import JobStatus
from balanceteshaters.model.repositories import (
    classification_job as classification_job_repository,
)


class ClassificationTask:
    def __init__(self, db: Database, classifier: BatchClassifier):
        self.logger = logging.getLogger(
            f"{__name__}.{self.__class__.__name__}",
        )
        self.db = db
        self.classifier = classifier

    async def classify(self, job_id: UUID):
        try:
            self.logger.info("Starting classification for job with id %s", job_id)
            await self.update_job_status(job_id, JobStatus.IN_PROGRESS)
            job = await self.get_job(job_id)
            if not job:
                self.logger.error("Classification job with id %s not found", job_id)
                await self.update_job_status(job_id, JobStatus.FAILED)
                return
            classification_result = await self.classify_comments(job.comments)
            await self.set_job_result(job_id, classification_result)
            await self.update_job_status(job_id, JobStatus.COMPLETED)
            self.logger.info("End classification for job with id %s", job_id)
        except Exception:
            self.logger.exception("Classification failed for job with id %s", job_id)
            await self.update_job_status(job_id, JobStatus.FAILED)

    async def classify_comments(self, comments: list[dict]):
        classifications = dict()
        for comment in comments:
            comment_id = comment["id"]
            self.logger.debug("Classifying comment with id %s", comment_id)

            text = comment.get("text_content", "")
            categories = await self.classifier.classify(text)

            classifications[comment_id] = {
                "classification": categories,
                "classified_at": datetime.datetime.now(datetime.timezone.utc)
                .isoformat()
                .replace("+00:00", "Z"),
            }
            classifications.update(
                await self.classify_comments(comment.get("replies", []))
            )
        return classifications

    async def get_job(self, job_id: UUID):
        async with self.db.get_session() as session, session.begin():
            return await classification_job_repository.find_by_id(session, job_id)

    async def update_job_status(self, job_id: UUID, status: JobStatus):
        async with self.db.get_session() as session, session.begin():
            return await classification_job_repository.update_job_status(
                session, job_id, status
            )

    async def set_job_result(self, job_id: UUID, result: dict):
        async with self.db.get_session() as session, session.begin():
            return await classification_job_repository.update_job_result(
                session, job_id, result
            )
