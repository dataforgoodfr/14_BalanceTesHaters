import asyncio
import datetime
import logging
from typing import Annotated

from balanceteshaters.classification_task import ClassificationTask
from balanceteshaters.infra.container import Container
from balanceteshaters.infra.database import Database
from balanceteshaters.model.base import JobStatus
from balanceteshaters.model.repositories import (
    classification_job as classification_job_repository,
)
from balanceteshaters.routers.classification_model import ClassificationJob
from dependency_injector.wiring import Provide, inject
from fastapi import APIRouter, Depends

router = APIRouter()

logger = logging.getLogger(
    f"{__name__}",
)


@router.post("/")
@inject
async def post_classification_job(
    job: ClassificationJob,
    db: Annotated[Database, Depends(Provide[Container.database])],
    classificationTask: Annotated[
        ClassificationTask, Depends(Provide[Container.classification_task])
    ],
):
    async with db.get_session() as session, session.begin():
        classification_job = classification_job_repository.create_job(
            session,
            datetime.datetime.now(timezone=datetime.timezone.utc),
            job.title,
            job.textContent,
            JobStatus.SUBMITED,
            job.comments,
        )
        await session.commit()
        asyncio.create_task(classificationTask.classify(classification_job.id))
        return {"job_id": str(classification_job.id)}
