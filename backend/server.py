import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from prometheus_fastapi_instrumentator import Instrumentator
from balanceteshaters.infra.container import Container
from balanceteshaters.infra.errors import register_exception_handlers
from balanceteshaters.infra.metrics_auth import create_metrics_authentication
from balanceteshaters.model.repositories import (
    classification_job as classification_job_repository,
)
from balanceteshaters.routers import classification_router
from fastapi import Depends, FastAPI

container = Container()
container.logging()

logger = logging.getLogger(__name__)
logger.info("Starting BalanceTesHaters")

container.init_resources()
container.classifier()


async def del_old_jobs():
    cutoff_date = datetime.now(timezone.utc) - timedelta(
        days=container.settings().cutoff_days
    )
    db = container.database()
    async with db.get_session() as session, session.begin():
        nb = await classification_job_repository.delete_job_created_before(
            session, cutoff_date
        )
        logger.info(f"{nb} classification job(s) deleted")
        await session.commit()


scheduler = AsyncIOScheduler()
scheduler.add_job(del_old_jobs, "interval", hours=1)


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.start()
    logger.info("Task scheduler started")
    batch_clf = container.batch_classifier()
    await batch_clf.start()
    logger.info("BatchClassifier background loop started")
    yield
    await batch_clf.stop()
    logger.info("BatchClassifier background loop stopped")
    scheduler.stop()
    logger.info("Task scheduler stopped")


app = FastAPI(lifespan=lifespan)
Instrumentator(
    should_instrument_requests_inprogress=True,
    excluded_handlers=["/metrics"],
).instrument(app, metric_namespace="bth", metric_subsystem="backend").expose(
    app,
    include_in_schema=False,
    dependencies=[
        Depends(
            create_metrics_authentication(
                container.settings().metrics_username,
                container.settings().metrics_password,
            )
        )
    ],
)

app.container = container
app.include_router(classification_router.router, prefix="/classification")
register_exception_handlers(app, logger)
