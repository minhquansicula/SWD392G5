import json
from functools import lru_cache

from pydantic import Field, SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

EMBEDDING_DIMENSIONS = 768


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = "gemini-2.5-flash"
    gemini_live_model: str = "gemini-2.5-flash-native-audio-latest"
    live_silence_ms: int = Field(default=1000, ge=300, le=3000)
    live_max_minutes: int = Field(default=45, ge=1, le=120)
    gemini_embedding_model: str = "gemini-embedding-001"
    database_url: str = "postgresql+psycopg://postgres:postgres@127.0.0.1:5432/aives_db"
    backend_api_url: str = "http://localhost:8080/api"
    cors_origins: str | list[str] = ["http://localhost:5173", "http://127.0.0.1:5173"]
    model_timeout_seconds: int = Field(default=120, ge=10, le=600)
    retrieval_top_k: int = Field(default=5, ge=1, le=10)
    max_upload_bytes: int = 10 * 1024 * 1024
    max_document_chars: int = 200_000
    max_rubric_chars: int = 25_000

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, v: str) -> str:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("postgres://"):
                return v.replace("postgres://", "postgresql+psycopg://", 1)
            if v.startswith("postgresql://") and not v.startswith("postgresql+"):
                return v.replace("postgresql://", "postgresql+psycopg://", 1)
        return v

    @field_validator("cors_origins")
    @classmethod
    def parse_cors_origins(cls, v) -> list[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(x).strip() for x in parsed if str(x).strip()]
                except Exception:
                    pass
            return [x.strip() for x in v.split(",") if x.strip()]
        if isinstance(v, list):
            return [str(x).strip() for x in v if str(x).strip()]
        return ["*"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
