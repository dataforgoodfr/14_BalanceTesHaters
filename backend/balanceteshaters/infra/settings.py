import pathlib

from pydantic import PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    pg_dsn: PostgresDsn
    engine_echo: bool = False
    logging_configuration_file: pathlib.Path
    api_token: str

    slm_model_path: str = "/models/qwen3-1.7b-q4_k_m.gguf"
    slm_n_threads: int = 4
    slm_n_ctx: int = 2048
    slm_max_batch_size: int = 16
    slm_batch_timeout_s: float = 0.5
    slm_max_ram_mb: int = 2048

    model_config = SettingsConfigDict(env_prefix="BTH_")
