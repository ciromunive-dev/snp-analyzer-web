"""Configuración de la aplicación usando pydantic-settings."""

from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuración del microservicio."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Redis (Upstash)
    upstash_redis_rest_url: str = ""
    upstash_redis_rest_token: str = ""

    # PostgreSQL (Neon)
    database_url: str = ""

    # NCBI
    ncbi_email: str = ""  # Requerido por NCBI para usar sus APIs
    ncbi_api_key: str = ""  # Opcional pero recomendado para más requests

    # Worker
    worker_sleep_interval: int = 5  # Segundos entre polls
    blast_timeout: int = 120  # Segundos

    # Queue
    queue_name: str = "snp-analysis-queue"

    # App
    app_name: str = "SNP Bioinfo Service"
    debug: bool = False

    @property
    def redis_url(self) -> str:
        """URL de Redis para conexión directa."""
        return self.upstash_redis_rest_url


@lru_cache
def get_settings() -> Settings:
    """Obtiene la configuración cacheada."""
    return Settings()


settings = get_settings()
