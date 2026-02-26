import asyncio
import logging

from balanceteshaters.infra.container import Container
from balanceteshaters.infra.database import Database
from balanceteshaters.model.base import JobStatus
from balanceteshaters.model.repositories import (
    classification_job as classification_job_repository,
)


async def run_failed_jobs(db: Database):
    async with db.get_session() as session, session.begin():
        classification_jobs = await classification_job_repository.list_jobs_by_status(
            session, JobStatus.FAILED
        )
        tasks = []
        logger.info(f"{len(classification_jobs)} failed jobs to run")
        for job in classification_jobs:
            classification_task = Container.classification_task()
            logger.info(f"Re-running failed job {job.id}")
            tasks.append(asyncio.create_task(classification_task.classify(job.id)))
        logger.info(f"Waiting for {len(tasks)} to complete")
        await asyncio.gather(*tasks)


if __name__ == "__main__":
    container = Container()
    container.logging()

    logger = logging.getLogger(__name__)
    logger.info("Starting Run failed jobs")

    container.init_resources()

    db = container.database()

    asyncio.run(run_failed_jobs(db))
    logger.info("End Run failed jobs")
