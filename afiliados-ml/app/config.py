"""Configuração validada, carregada do ambiente e do arquivo .env."""

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

PROJECT_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """Variáveis compartilhadas pelos serviços e futuros pontos de entrada."""

    model_config = SettingsConfigDict(
        env_file=PROJECT_ROOT / ".env",
        env_file_encoding="utf-8",
        extra="forbid",
        frozen=True,
    )

    database_url: str = Field(default="sqlite:///./afiliados.db", min_length=1, repr=False)
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"] = "INFO"


@lru_cache
def get_settings() -> Settings:
    """Carrega e mantém uma configuração por processo, sem expor credenciais."""
    return Settings()
