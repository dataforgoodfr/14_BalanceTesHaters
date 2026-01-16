import logging.config

from balanceteshaters.infra.database import Database
from balanceteshaters.infra.settings import Settings
from dependency_injector import containers, providers


class Container(containers.DeclarativeContainer):
    settings = providers.Singleton(Settings)

    wiring_config = containers.WiringConfiguration(
        ["balanceteshaters.routers.ml_router"]
    )
    logging = providers.Resource(
        logging.config.fileConfig,
        fname=settings().logging_configuration_file,
    )

    database = providers.ThreadSafeSingleton(
        Database, db_dsn=settings().db.pg_dsn, db_echo=settings().db.engine_echo
    )
