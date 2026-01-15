import pathlib

from pydantic import BaseModel, PostgresDsn
from pydantic_settings import BaseSettings, SettingsConfigDict, YamlConfigSettingsSource


class DbSettings(BaseModel):
    pg_dsn: PostgresDsn
    engine_echo: bool


class Settings(BaseSettings):
    db: DbSettings
    logging_configuration_file: pathlib.Path

    model_config = SettingsConfigDict(yaml_file="configuration.yml")

    @classmethod
    def settings_customise_sources(cls, settings_cls: type[BaseSettings], **kwargs):
        return (YamlConfigSettingsSource(settings_cls),)
