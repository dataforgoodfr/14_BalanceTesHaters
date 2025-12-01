import pathlib

from pydantic import BaseModel, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict, YamlConfigSettingsSource


class Argon2Settings(BaseModel):
    time_cost: int
    memory_cost: int
    parallelism: int
    hash_len: int
    salt_len: int


class JwtSettings(BaseModel):
    algorithm: str
    secret_key: str
    token_expire_minutes: int


class AuthSettings(BaseModel):
    argon2: Argon2Settings
    jwt: JwtSettings


class DbSettings(BaseModel):
    pg_dsn: PostgresDsn
    engine_echo: bool


class Settings(BaseSettings):
    db: DbSettings
    logging_configuration_file: pathlib.Path
    auth: AuthSettings

    model_config = SettingsConfigDict(yaml_file="configuration.yml")

    @classmethod
    def settings_customise_sources(cls, settings_cls: type[BaseSettings], **kwargs):
        return (YamlConfigSettingsSource(settings_cls),)
