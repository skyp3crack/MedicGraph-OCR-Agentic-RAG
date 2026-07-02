"""
RAG Service — Orchestrates the full Retrieval-Augmented Generation pipeline.

Wires together OCR extraction, text chunking, vector embedding, similarity
retrieval, and LLM generation into a cohesive service for medical report Q&A.
"""

import os
import uuid
import logging
from typing import Any, cast
from langchain_google_genai import GoogleGenerativeAI
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate
from langchain_community.vectorstores import Chroma

from app.config import get_settings
from app.Services.ocr_service import extract_text_from_pdf
from app.Services.embedding_service import (
    create_text_chunks,
    get_embeddings_model,
    create_vector_store,
    load_vector_store,
)

logger = logging.getLogger(__name__)

# --- System Prompt ---
# Constrains the LLM to only answer from the provided context.
# Critical for medical data safety — prevents hallucinated medical advice.
MEDICAL_SYSTEM_PROMPT = (
    "You are an AI expert assistant in medical reports. "
    "Answer questions only based on provided Context. "
    "If the answer is not in the context, just state you don't have enough information. "
    "Be precise and cite specific findings from the report when possible."
)


class RAGService:
    """
    Orchestrates the end-to-end RAG pipeline for medical report analysis.

    Manages document ingestion (OCR → chunk → embed → store) and
    querying (retrieve → generate) with isolated sessions per document.
    """

    def __init__(self):
        settings = get_settings()

        # Initialize the embeddings model (Google free tier)
        self._embeddings = get_embeddings_model(
            model=settings.embedding_model,
            api_key=settings.gemini_api_key,
        )

        # Initialize the LLM
        self._llm = GoogleGenerativeAI(
            model=settings.llm_model,
            google_api_key=settings.gemini_api_key,
        )

        # Build the prompt template
        self._prompt = ChatPromptTemplate.from_messages([
            ("system", MEDICAL_SYSTEM_PROMPT),
            ("human", "Context: {context}\nQuestion: {input}"),
        ])

        # Storage settings
        self._base_persist_dir = settings.chroma_persist_dir
        self._chunk_size = settings.chunk_size
        self._chunk_overlap = settings.chunk_overlap
        self._retriever_k = settings.retriever_k

        # In-memory registry of active document sessions
        self._sessions: dict[str, dict[str, Any]] = {}

        logger.info(
            f"RAGService initialized (LLM={settings.llm_model}, "
            f"Embeddings={settings.embedding_model})"
        )

    def ingest_pdf(self, pdf_path: str) -> dict:
        """
        Full ingestion pipeline: Extract → Chunk → Embed → Store.

        Args:
            pdf_path: Path to the PDF file to ingest.

        Returns:
            Dictionary with document_id, num_chunks, and status.
        """
        document_id = str(uuid.uuid4())
        persist_dir = os.path.join(self._base_persist_dir, document_id)

        logger.info(f"Ingesting PDF: {pdf_path} → document_id={document_id}")

        # Step 1: Extract text from PDF
        text = extract_text_from_pdf(pdf_path)
        logger.info(f"Extracted {len(text)} characters from PDF")

        # Step 2: Chunk the text
        chunks = create_text_chunks(
            text,
            chunk_size=self._chunk_size,
            chunk_overlap=self._chunk_overlap,
        )

        # Step 3: Embed and store in ChromaDB
        vector_store = create_vector_store(
            chunks=chunks,
            embeddings_model=self._embeddings,
            persist_directory=persist_dir,
        )

        # Step 4: Register the session
        self._sessions[document_id] = {
            "vector_store": vector_store,
            "persist_dir": persist_dir,
            "pdf_path": pdf_path,
            "num_chunks": len(chunks),
        }

        # Persist metadata to disk
        try:
            import json
            os.makedirs(persist_dir, exist_ok=True)
            with open(os.path.join(persist_dir, "metadata.json"), "w") as f:
                json.dump({
                    "pdf_path": pdf_path,
                    "num_chunks": len(chunks),
                }, f)
        except Exception as e:
            logger.warning(f"Failed to persist metadata for document {document_id}: {e}")

        logger.info(f"Ingestion complete: {len(chunks)} chunks stored for document {document_id}")

        return {
            "document_id": document_id,
            "num_chunks": len(chunks),
            "characters_extracted": len(text),
        }

    def ingest_scrubbed_text(self, document_id: str, scrubbed_text: str, pdf_path: str) -> dict:
        """
        Ingest PHI-scrubbed text into the vector store under an existing document ID.

        Args:
            document_id: Existing document UUID.
            scrubbed_text: De-identified text content.
            pdf_path: Original PDF path (for metadata indexing).

        Returns:
            Dictionary with num_chunks.
        """
        persist_dir = os.path.join(self._base_persist_dir, document_id)
        logger.info(f"Ingesting scrubbed text for document_id={document_id} at {persist_dir}")

        chunks = create_text_chunks(
            scrubbed_text,
            chunk_size=self._chunk_size,
            chunk_overlap=self._chunk_overlap,
        )

        vector_store = create_vector_store(
            chunks=chunks,
            embeddings_model=self._embeddings,
            persist_directory=persist_dir,
        )

        self._sessions[document_id] = {
            "vector_store": vector_store,
            "persist_dir": persist_dir,
            "pdf_path": pdf_path,
            "num_chunks": len(chunks),
        }

        # Persist metadata to disk
        try:
            import json
            os.makedirs(persist_dir, exist_ok=True)
            with open(os.path.join(persist_dir, "metadata.json"), "w") as f:
                json.dump({
                    "pdf_path": pdf_path,
                    "num_chunks": len(chunks),
                }, f)
        except Exception as e:
            logger.warning(f"Failed to persist metadata for document {document_id}: {e}")

        logger.info(f"Scrubbed text ingestion complete: {len(chunks)} chunks stored for document {document_id}")
        return {
            "num_chunks": len(chunks),
        }

    def query(self, document_id: str, question: str) -> dict:
        """
        Query a previously ingested document using the RAG chain.

        Args:
            document_id: ID returned from ingest_pdf().
            question: Natural-language question about the medical report.

        Returns:
            Dictionary with answer and source_chunks.

        Raises:
            ValueError: If the document_id is not found.
        """
        session = self._sessions.get(document_id)
        if not session:
            # Try to load from disk if not in memory
            persist_dir = os.path.join(self._base_persist_dir, document_id)
            if os.path.exists(persist_dir):
                vector_store = load_vector_store(self._embeddings, persist_dir)
                pdf_path = None
                try:
                    import json
                    meta_path = os.path.join(persist_dir, "metadata.json")
                    if os.path.exists(meta_path):
                        with open(meta_path, "r") as f:
                            meta_data = json.load(f)
                            pdf_path = meta_data.get("pdf_path")
                except Exception as e:
                    logger.warning(f"Failed to load metadata for document {document_id}: {e}")

                session = {
                    "vector_store": vector_store,
                    "persist_dir": persist_dir,
                    "pdf_path": pdf_path
                }
                self._sessions[document_id] = session
            else:
                raise ValueError(f"Document not found: {document_id}")

        logger.info(f"Query on document {document_id}: {question[:80]}...")

        # Build the RAG chain
        document_chain = create_stuff_documents_chain(self._llm, self._prompt)
        store = cast(Chroma, session["vector_store"])
        retriever = store.as_retriever(
            search_kwargs={"k": self._retriever_k}
        )
        retrieval_chain = create_retrieval_chain(retriever, document_chain)

        # Execute the chain
        response = retrieval_chain.invoke({"input": question})

        # Extract source chunks for transparency
        source_chunks = []
        for doc in response.get("context", []):
            source_chunks.append({
                "content": doc.page_content,
                "metadata": doc.metadata,
            })

        logger.info(f"Query answered with {len(source_chunks)} source chunks")

        return {
            "answer": response["answer"],
            "source_chunks": source_chunks,
        }

    def list_documents(self) -> list[str]:
        """Return list of currently loaded document IDs."""
        return list(self._sessions.keys())

    def get_pdf_path(self, document_id: str) -> str:
        """
        Get the original PDF path for a document ID.

        Args:
            document_id: The document UUID.

        Returns:
            The file path to the PDF on disk.
        """
        session = self._sessions.get(document_id)
        if not session or not session.get("pdf_path"):
            # Load metadata from disk
            persist_dir = os.path.join(self._base_persist_dir, document_id)
            meta_path = os.path.join(persist_dir, "metadata.json")
            if os.path.exists(meta_path):
                import json
                try:
                    with open(meta_path, "r") as f:
                        meta_data = json.load(f)
                        pdf_path = meta_data.get("pdf_path")
                        if pdf_path:
                            # Re-populate session in memory
                            if document_id in self._sessions:
                                self._sessions[document_id]["pdf_path"] = pdf_path
                            else:
                                self._sessions[document_id] = {
                                    "pdf_path": pdf_path,
                                    "persist_dir": persist_dir
                                }
                            return pdf_path
                except Exception as e:
                    logger.warning(f"Failed to read metadata file: {e}")
            raise ValueError(f"PDF path not found or not indexed for document: {document_id}")

        return session["pdf_path"]

