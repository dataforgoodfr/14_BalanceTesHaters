import logging.config

from balanceteshaters.classification_task import ClassificationTask
from balanceteshaters.infra.database import Database
from balanceteshaters.infra.settings import Settings
from dependency_injector import containers, providers


class Container(containers.DeclarativeContainer):
    settings = providers.Singleton(Settings)

    wiring_config = containers.WiringConfiguration(
        ["balanceteshaters.routers.classification_router"]
    )
    logging = providers.Resource(
        logging.config.fileConfig,
        fname=settings().logging_configuration_file,
    )

    database = providers.ThreadSafeSingleton(
        Database, db_dsn=settings().pg_dsn, db_echo=settings().engine_echo
    )

    classification_task = providers.Factory(ClassificationTask, db=database.provided)
