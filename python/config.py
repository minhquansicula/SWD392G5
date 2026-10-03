import os
from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Google Gemini API
    gemini_api_key: str = Field(default=os.getenv("GEMINI_API_KEY", ""))
    
    # Model configuration
    # Ưu tiên Gemini 3.8 Live cho đàm thoại thời gian thực hai chiều (bidiGenerateContent)
    model_live: str = Field(default=os.getenv("MODEL_LIVE", "models/gemini-3.8-live"))
    # Fallback model nếu tài khoản chưa được whitelist gemini-3.8-live
    model_live_fallback: str = Field(default=os.getenv("MODEL_LIVE_FALLBACK", "models/gemini-2.5-flash-native-audio-preview-12-2025"))
    # Model chuyên chấm Rubric JSON
    model_grading: str = Field(default=os.getenv("MODEL_GRADING", "models/gemini-2.5-flash"))

    # Giọng đọc mặc định: Puck (nam trẻ), Charon (nam trầm), Fenrir (nam đĩnh đạc), Aoede (nữ ấm áp), Kore (nữ tự nhiên)
    live_voice: str = Field(default=os.getenv("LIVE_VOICE", "Puck"))
    
    # Backend Spring Boot Integration
    backend_internal_url: str = Field(default=os.getenv("BACKEND_INTERNAL_URL", "http://localhost:8080/api/internal"))
    internal_api_key: str = Field(default=os.getenv("INTERNAL_API_KEY", "aives_internal_secret_key_2026"))

    # PostgreSQL & pgvector RAG Configuration
    postgres_host: str = Field(default=os.getenv("POSTGRES_HOST", "localhost"))
    postgres_port: int = Field(default=int(os.getenv("POSTGRES_PORT", "5432")))
    postgres_db: str = Field(default=os.getenv("POSTGRES_DB", "aives_db"))
    postgres_user: str = Field(default=os.getenv("POSTGRES_USER", "postgres"))
    postgres_password: str = Field(default=os.getenv("POSTGRES_PASSWORD", "postgres"))

    # RAG Settings
    rag_enabled: bool = Field(default=os.getenv("RAG_ENABLED", "true").lower() in ("true", "1", "yes"))
    model_embedding: str = Field(default=os.getenv("MODEL_EMBEDDING", "models/text-embedding-004"))
    rag_top_k: int = Field(default=int(os.getenv("RAG_TOP_K", "3")))
    rag_similarity_threshold: float = Field(default=float(os.getenv("RAG_SIMILARITY_THRESHOLD", "0.60")))

    # Server settings
    host: str = Field(default=os.getenv("HOST", "0.0.0.0"))
    port: int = Field(default=int(os.getenv("PORT", "8000")))

settings = Settings()
