import logging.config

from dependency_injector import containers, providers
from fastapi.security import OAuth2PasswordBearer
from balanceteshaters.infra.database import Database
from balanceteshaters.infra.settings import Settings
from balanceteshaters.services.auth_service import AuthService


class Container(containers.DeclarativeContainer):
    #settings = providers.Configuration(pydantic_settings=[Settings()])
    settings = providers.Singleton(Settings)

    wiring_config = containers.WiringConfiguration(["balanceteshaters.routers.auth_router"])
    logging = providers.Resource(
        logging.config.fileConfig,
        fname=settings().logging_configuration_file,
    )

    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")

    database = providers.ThreadSafeSingleton(
        Database, db_dsn=settings().db.pg_dsn, db_echo=settings().db.engine_echo
    )
    auth_service = providers.Factory(
        AuthService,
        db=database.provided,
        settings = settings()
    )
