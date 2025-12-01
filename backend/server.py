import logging

from balanceteshaters.infra.container import Container
from balanceteshaters.infra.errors import register_exception_handlers
from balanceteshaters.routers import auth_router
from fastapi import FastAPI

container = Container()
container.logging()

logger = logging.getLogger(__name__)
logger.info("Starting BalanceTesHaters")

container.init_resources()
app = FastAPI()

app.container = container
app.include_router(auth_router.router, prefix="/auth")
register_exception_handlers(app, logger)
