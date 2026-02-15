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
            datetime.datetime.now(datetime.timezone.utc),
            job.title,
            job.text_content,
            JobStatus.SUBMITTED,
            job.author.model_dump(),
            job.model_dump()["comments"],
        )
        await session.commit()
        asyncio.create_task(classificationTask.classify(classification_job.id))
        return {"job_id": str(classification_job.id)}


@router.get("/{job_id}")
@inject
async def get_classification_job(
    job_id: str,
    db: Annotated[Database, Depends(Provide[Container.database])],
):
    async with db.get_session() as session, session.begin():
        classification_job = await classification_job_repository.find_by_id(
            session, job_id
        )
        if not classification_job:
            return {"error": "Classification job not found"}
        return {
            "id": str(classification_job.id),
            "comments": classification_job.result,
            "status": classification_job.status.value,
        }
