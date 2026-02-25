import pathlib

from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    pg_dsn: PostgresDsn
    engine_echo: bool = False
    logging_configuration_file: pathlib.Path
    api_token: str

    model_config = SettingsConfigDict(env_prefix="BTH_")
