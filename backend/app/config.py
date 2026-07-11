"""
Centralized application configuration using Pydantic BaseSettings.

Loads environment variables from .env and validates required API keys at startup.
Single source of truth for all configuration values across the application.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from functools import lru_cache


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- API Keys ---
    openrouter_api_key: str = Field(
        default="",
        description="OpenRouter API key (optional, not used for embeddings)"
    )
    gemini_api_key: str = Field(
        ...,
        description="Google Gemini API key for LLM inference"
    )

    # --- Security ---
    jwt_secret_key: str = Field(
        default="medicograph_super_secret_key_123",
        description="Secret key for signing JWT tokens. MUST be changed in production."
    )

    # --- Database ---
    database_url: str = Field(
        default="sqlite:///./data/medicograph.db",
        description="SQLAlchemy database URL"
    )

    # --- Model Configuration ---
    embedding_model: str = Field(
        default="models/gemini-embedding-001",
        description="Google Gemini embedding model (free tier)"
    )
    llm_model: str = Field(
        default="gemini-2.5-flash",
        description="Google Gemini model name for LLM inference"
    )

    # --- Storage Configuration ---
    chroma_persist_dir: str = Field(
        default="./chroma_db",
        description="Directory for ChromaDB persistent storage"
    )
    upload_dir: str = Field(
        default="./uploads",
        description="Directory for uploaded PDF files"
    )

    # --- Chunking Configuration ---
    chunk_size: int = Field(
        default=1000,
        description="Character count per text chunk"
    )
    chunk_overlap: int = Field(
        default=200,
        description="Character overlap between consecutive chunks"
    )

    # --- RAG Configuration ---
    retriever_k: int = Field(
        default=5,
        description="Number of top-K relevant chunks to retrieve"
    )

    # --- CORS ---
    cors_origins: list[str] = Field(
        default=["http://localhost:3000"],
        description="Allowed CORS origins (frontend URLs)"
    )

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": False,
    }


@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached singleton of application settings.
    Uses lru_cache to avoid re-reading .env on every call.
    """
    return Settings()
