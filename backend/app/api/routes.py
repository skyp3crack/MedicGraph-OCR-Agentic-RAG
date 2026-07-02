"""
API Route Handlers — FastAPI endpoints for the MedicGraph RAG pipeline.

Endpoints:
    POST /api/upload  — Upload a PDF and run the full ingestion pipeline
    POST /api/query   — Ask a question against an ingested document
    GET  /api/health  — Health check with service status
"""

import os
import shutil
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel

from app.schemas.requests import QueryRequest
from app.schemas.responses import UploadResponse, QueryResponse, HealthResponse
from app.schemas.kkm_schemas import ClinicalExtractionResponse
from app.Services.rag_service import RAGService
from app.Services.extraction_service import ExtractionService
from app.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["MedicGraph RAG"])

# Singleton RAG service instance — initialized on first use
_rag_service: RAGService | None = None
_extraction_service: ExtractionService | None = None


def get_rag_service() -> RAGService:
    """Lazy-initialize the RAG service singleton."""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service


def get_extraction_service() -> ExtractionService:
    """Lazy-initialize the Extraction service singleton."""
    global _extraction_service
    if _extraction_service is None:
        _extraction_service = ExtractionService()
    return _extraction_service


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload a medical report PDF for ingestion.

    The file is saved to disk, then processed through the full RAG pipeline:
    OCR text extraction → text chunking → embedding generation → vector storage.

    Returns a document_id that can be used in subsequent /query requests.
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Only PDF files are accepted. Please upload a .pdf file."
        )

    settings = get_settings()
    upload_dir = settings.upload_dir

    # Ensure upload directory exists
    os.makedirs(upload_dir, exist_ok=True)

    # Save uploaded file to disk
    file_path = os.path.join(upload_dir, file.filename)
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Saved uploaded file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    finally:
        await file.close()

    # Run the ingestion pipeline
    try:
        rag_service = get_rag_service()
        result = rag_service.ingest_pdf(file_path)
    except Exception as e:
        logger.error(f"Ingestion pipeline failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"PDF ingestion failed: {e}"
        )

    return UploadResponse(
        document_id=result["document_id"],
        num_chunks=result["num_chunks"],
        characters_extracted=result["characters_extracted"],
        message=f"Successfully ingested '{file.filename}' into {result['num_chunks']} chunks",
    )


@router.post("/query", response_model=QueryResponse)
async def query_document(request: QueryRequest):
    """
    Ask a natural-language question about a previously ingested medical report.

    The question is embedded, matched against the vector store via similarity search,
    and the top-K relevant chunks are passed to Gemini LLM for a grounded answer.
    """
    try:
        rag_service = get_rag_service()
        result = rag_service.query(
            document_id=request.document_id,
            question=request.question,
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Query failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Query processing failed: {e}"
        )

    return QueryResponse(
        answer=result["answer"],
        source_chunks=result["source_chunks"],
        document_id=request.document_id,
    )


@router.post("/extract", response_model=ClinicalExtractionResponse)
async def extract_clinical_data(request: QueryRequest):
    """
    Extract structured patient demographics, ICD-11 codes and validation alerts
    from an ingested PDF report document.
    """
    try:
        rag_service = get_rag_service()
        pdf_path = rag_service.get_pdf_path(request.document_id)
        
        # Load raw text from PDF
        from app.Services.ocr_service import extract_text_from_pdf
        text = extract_text_from_pdf(pdf_path)
        
        # Extract clinical details
        extraction_service = get_extraction_service()
        result = extraction_service.extract(text)
        
        # Fill in the document_id in the response
        result["document_id"] = request.document_id
        return result
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Clinical data extraction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Extraction failed: {e}")


class AuditActionRequest(BaseModel):
    document_id: str
    action: str  # approve, reject, escalate
    payload: dict | None = None


@router.post("/audit/action")
async def audit_action(request: AuditActionRequest):
    """
    Log or execute audit actions (Approve, Reject, Escalate) from clinician HITL review.
    """
    logger.info(f"Audit action received: {request.action} on document {request.document_id}")
    return {
        "status": "success",
        "message": f"Action '{request.action}' recorded successfully for document {request.document_id}"
    }


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint — reports the status of all service components.
    """
    services = {
        "fastapi": "healthy",
        "rag_service": "not_initialized",
    }

    if _rag_service is not None:
        services["rag_service"] = "healthy"
        services["loaded_documents"] = str(len(_rag_service.list_documents()))

    return HealthResponse(
        status="healthy",
        services=services,
        version="0.1.0",
    )
