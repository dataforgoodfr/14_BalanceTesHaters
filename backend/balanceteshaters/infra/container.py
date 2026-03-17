import logging.config

from balanceteshaters.classification.batch_classifier import BatchClassifier
from balanceteshaters.classification.classification_task import ClassificationTask
from balanceteshaters.classification.slm_classifier import SLMClassifier
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

    slm_classifier = providers.ThreadSafeSingleton(
        SLMClassifier,
        model_path=settings().slm_model_path,
        n_threads=settings().slm_n_threads,
        n_ctx=settings().slm_n_ctx,
    )

    batch_classifier = providers.ThreadSafeSingleton(
        BatchClassifier,
        classifier=slm_classifier.provided,
        max_batch_size=settings().slm_max_batch_size,
        batch_timeout_s=settings().slm_batch_timeout_s,
    )

    classification_task = providers.Factory(
        ClassificationTask,
        db=database.provided,
        classifier=batch_classifier.provided,
    )
