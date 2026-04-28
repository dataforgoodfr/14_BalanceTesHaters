import pathlib

from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    pg_dsn: PostgresDsn
    engine_echo: bool = False
    logging_configuration_file: pathlib.Path
    private_api_token: str
    public_api_token: str
    cutoff_days: int = 30

    embedding_hf_repo_id: str = "gregco/balance-tes-haters-classifier"
    embedding_threshold: float = 0.3
    embedding_max_batch_size: int = 64
    embedding_batch_timeout_s: float = 0.05

    model_config = SettingsConfigDict(env_prefix="BTH_")
