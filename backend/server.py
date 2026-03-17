import logging
from contextlib import asynccontextmanager

from balanceteshaters.infra.container import Container
from balanceteshaters.infra.errors import register_exception_handlers
from balanceteshaters.routers import classification_router
from fastapi import FastAPI

container = Container()
container.logging()

logger = logging.getLogger(__name__)
logger.info("Starting BalanceTesHaters")

container.init_resources()
container.slm_classifier()


@asynccontextmanager
async def lifespan(app: FastAPI):
    batch_clf = container.batch_classifier()
    await batch_clf.start()
    logger.info("BatchClassifier background loop started")
    yield
    await batch_clf.stop()
    logger.info("BatchClassifier background loop stopped")


app = FastAPI(lifespan=lifespan)

app.container = container
app.include_router(classification_router.router, prefix="/classification")
register_exception_handlers(app, logger)
