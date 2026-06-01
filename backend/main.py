"""
MedicGraph OCR + Agentic RAG — FastAPI Application Entry Point

Configures CORS, logging, and registers API route handlers for the
medical report analysis pipeline.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.api.routes import router as api_router


# --- Logging Configuration ---
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


# --- Lifespan Events ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup and shutdown lifecycle."""
    settings = get_settings()
    logger.info("=" * 60)
    logger.info("MedicGraph RAG API starting up")
    logger.info(f"  LLM Model:       {settings.llm_model}")
    logger.info(f"  Embedding Model:  {settings.embedding_model}")
    logger.info(f"  ChromaDB Dir:     {settings.chroma_persist_dir}")
    logger.info(f"  CORS Origins:     {settings.cors_origins}")
    logger.info("=" * 60)
    yield
    logger.info("MedicGraph RAG API shutting down")


# --- FastAPI App ---
app = FastAPI(
    title="MedicGraph OCR + Agentic RAG API",
    description=(
        "Intelligent Medical Report Analysis powered by OCR, "
        "Vector Search, and LLM-driven Retrieval-Augmented Generation."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

# --- CORS Middleware ---
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register Routers ---
app.include_router(api_router)


@app.get("/", tags=["Root"])
async def root():
    """Root endpoint — redirects to API documentation."""
    return {
        "service": "MedicGraph OCR + Agentic RAG",
        "version": "0.1.0",
        "docs": "/docs",
        "health": "/api/health",
    }