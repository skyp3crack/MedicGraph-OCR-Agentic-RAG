"""
Embedding Service — Text chunking and vector store management.

Handles splitting text into chunks, generating embeddings via OpenAI-compatible
API (routed through OpenRouter), and persisting vectors in ChromaDB.
"""

import logging

from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_google_genai import GoogleGenerativeAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter

logger = logging.getLogger(__name__)


def create_text_chunks(
    text: str,
    chunk_size: int = 1000,
    chunk_overlap: int = 200
) -> list[Document]:
    """
    Split text into semantically meaningful chunks using recursive character splitting.

    Args:
        text: Raw text content to split.
        chunk_size: Maximum number of characters per chunk.
        chunk_overlap: Number of overlapping characters between consecutive chunks.

    Returns:
        List of LangChain Document objects containing the text chunks.

    Raises:
        ValueError: If the text is empty or chunk parameters are invalid.
    """
    if not text or not text.strip():
        raise ValueError("Cannot chunk empty text")

    if chunk_size <= 0 or chunk_overlap < 0:
        raise ValueError("chunk_size must be positive and chunk_overlap must be non-negative")

    if chunk_overlap >= chunk_size:
        raise ValueError("chunk_overlap must be less than chunk_size")

    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=len,
        is_separator_regex=False,
    )

    chunks = text_splitter.create_documents([text])
    logger.info(f"Created {len(chunks)} chunks (size={chunk_size}, overlap={chunk_overlap})")
    return chunks


def get_embeddings_model(
    model: str,
    api_key: str
) -> GoogleGenerativeAIEmbeddings:
    """
    Initialize the Google Gemini embeddings model (free tier).

    Args:
        model: Embedding model name (e.g., "models/text-embedding-004").
        api_key: Google Gemini API key.

    Returns:
        Configured GoogleGenerativeAIEmbeddings instance.
    """
    return GoogleGenerativeAIEmbeddings(
        model=model,
        google_api_key=api_key,
    )


def create_vector_store(
    chunks: list[Document],
    embeddings_model: GoogleGenerativeAIEmbeddings,
    persist_directory: str
) -> Chroma:
    """
    Create a ChromaDB vector store from document chunks and persist to disk.

    Args:
        chunks: List of LangChain Document objects to embed and store.
        embeddings_model: Configured embeddings model for generating vectors.
        persist_directory: Directory path for ChromaDB persistent storage.

    Returns:
        ChromaDB vector store instance with embedded documents.
    """
    logger.info(f"Creating vector store with {len(chunks)} chunks at: {persist_directory}")

    vector_store = Chroma.from_documents(
        documents=chunks,
        embedding=embeddings_model,
        persist_directory=persist_directory,
    )

    logger.info("Vector store created and persisted successfully")
    return vector_store


def load_vector_store(
    embeddings_model: GoogleGenerativeAIEmbeddings,
    persist_directory: str
) -> Chroma:
    """
    Load an existing ChromaDB vector store from disk.

    Args:
        embeddings_model: Configured embeddings model (must match the one used to create the store).
        persist_directory: Directory path where the ChromaDB data is stored.

    Returns:
        ChromaDB vector store instance loaded from persistent storage.
    """
    logger.info(f"Loading vector store from: {persist_directory}")

    vector_store = Chroma(
        embedding_function=embeddings_model,
        persist_directory=persist_directory,
    )

    logger.info("Vector store loaded successfully")
    return vector_store
