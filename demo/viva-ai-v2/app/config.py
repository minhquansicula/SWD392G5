from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

EMBEDDING_DIMENSIONS = 768


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = "gemini-3.5-flash"
    gemini_live_model: str = "gemini-3.8-live"
    live_silence_ms: int = Field(default=1000, ge=300, le=3000)
    live_max_minutes: int = Field(default=45, ge=1, le=120)
    gemini_embedding_model: str = "gemini-embedding-001"
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/aives_db"
    model_timeout_seconds: int = Field(default=120, ge=10, le=600)
    retrieval_top_k: int = Field(default=5, ge=1, le=10)
    max_upload_bytes: int = 10 * 1024 * 1024
    max_document_chars: int = 200_000
    max_rubric_chars: int = 25_000


@lru_cache
def get_settings() -> Settings:
    return Settings()
