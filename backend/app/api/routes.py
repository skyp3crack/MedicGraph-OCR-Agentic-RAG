"""
API Route Handlers — FastAPI endpoints for the MedicGraph RAG pipeline.

Endpoints:
    POST /api/upload  — Upload a PDF and run the full ingestion pipeline
    POST /api/query   — Ask a question against an ingested document
    GET  /api/health  — Health check with service status
"""

import os
import uuid
import shutil
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from pydantic import BaseModel

from app.schemas.requests import QueryRequest
from app.schemas.responses import UploadResponse, QueryResponse, HealthResponse
from app.schemas.kkm_schemas import ClinicalExtractionResponse
from app.Services.rag_service import RAGService
from app.Services.extraction_service import ExtractionService
from app.config import get_settings
from app.Agents.clinical_graph import clinical_graph

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


def run_graph_in_background(document_id: str, file_path: str):
    """Executes the state graph workflow asynchronously."""
    try:
        config = {"configurable": {"thread_id": document_id}}
        initial_state = {
            "document_id": document_id,
            "pdf_path": file_path,
            "raw_text": "",
            "scrubbed_text": "",
            "extraction": {},
            "audit_action": None,
            "status": "parsing",
            "error_message": None,
            "num_chunks": 0
        }
        clinical_graph.invoke(initial_state, config)
        logger.info(f"Background LangGraph run completed for document {document_id}")
    except Exception as e:
        logger.error(f"Background LangGraph run failed for document {document_id}: {e}")


@router.post("/upload", response_model=UploadResponse)
async def upload_pdf(file: UploadFile = File(...), background_tasks: BackgroundTasks = None):
    """
    Upload a medical report PDF for stateful ingestion using LangGraph.

    The file is saved to disk, then processed through the clinical state graph:
    OCR Parsing -> Clinical Extraction -> PHI Scrubbing -> Vector Indexing.
    The graph then interrupts right before clinician human review.
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

    document_id = str(uuid.uuid4())
    file_path = os.path.join(upload_dir, f"{document_id}_{file.filename}")
    
    # Save uploaded file to disk
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        logger.info(f"Saved uploaded file: {file_path}")
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to save file: {e}")
    finally:
        await file.close()

    # Trigger graph execution in the background
    if background_tasks:
        background_tasks.add_task(run_graph_in_background, document_id, file_path)
        logger.info(f"LangGraph execution scheduled in background for document {document_id}")
    else:
        # Fallback to synchronous run if background_tasks is not provided
        run_graph_in_background(document_id, file_path)

    return UploadResponse(
        document_id=document_id,
        num_chunks=0,
        characters_extracted=0,
        message=f"Ingestion workflow successfully scheduled for '{file.filename}'",
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
    Retrieve pre-extracted structured clinical data from the active LangGraph session.
    """
    try:
        config = {"configurable": {"thread_id": request.document_id}}
        
        # Retrieve graph state
        state = clinical_graph.get_state(config)
        if not state or not state.values:
            raise HTTPException(status_code=404, detail=f"No active session for document {request.document_id}")
            
        state_values = state.values
        extraction = state_values.get("extraction")
        if not extraction:
            err = state_values.get("error_message") or "Extraction data is missing"
            raise HTTPException(status_code=500, detail=f"Clinical data extraction failed: {err}")
            
        # Fill in the document_id in the response
        extraction_response = dict(extraction)
        extraction_response["document_id"] = request.document_id
        return extraction_response
    except HTTPException:
        raise
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
    Resume LangGraph execution by applying clinician audit decisions (Approve, Reject, Escalate).
    """
    try:
        config = {"configurable": {"thread_id": request.document_id}}
        
        # Check current state
        state = clinical_graph.get_state(config)
        if not state or not state.values:
            raise HTTPException(status_code=404, detail=f"No active session for document {request.document_id}")
            
        update_data = {
            "audit_action": request.action
        }
        
        if request.payload:
            # Save any edits made by clinician on the dashboard back into state graph
            extraction = dict(state.values.get("extraction", {}))
            
            if "demographics" in request.payload:
                demo = request.payload["demographics"]
                extraction["demographics"] = {
                    "name": demo.get("name", ""),
                    "ic_number": demo.get("icNumber", demo.get("ic_number", "")),
                    "gender": demo.get("gender", ""),
                    "age": demo.get("age", ""),
                    "admission_date": demo.get("admissionDate", demo.get("admission_date", ""))
                }
            if "mainDiagnosis" in request.payload:
                md = request.payload["mainDiagnosis"]
                extraction["main_diagnosis"] = {
                    "icd11_code": md.get("icd11_code", ""),
                    "diagnosis_text": md.get("diagnosis_text", ""),
                    "source": md.get("source", "user"),
                    "confidence": md.get("confidence", 1.0)
                }
            if "otherDiagnoses" in request.payload:
                od = request.payload["otherDiagnoses"]
                extraction["other_diagnoses"] = [
                    {
                        "icd11_code": d.get("icd11_code", ""),
                        "diagnosis_text": d.get("diagnosis_text", ""),
                        "source": d.get("source", "user"),
                        "confidence": d.get("confidence", 1.0)
                    } for d in od
                ]
            update_data["extraction"] = extraction
            
        # Update thread state
        clinical_graph.update_state(config, update_data)
        
        # Resume workflow (invoke with None tells graph to proceed past interrupt)
        clinical_graph.invoke(None, config)
        
        final_state = clinical_graph.get_state(config)
        final_status = final_state.values.get("status", "review_pending") if final_state else "completed"
        
        return {
            "status": "success",
            "message": f"Action '{request.action}' processed. Status is now {final_status}."
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Audit action failed: {e}")
        raise HTTPException(status_code=500, detail=f"Audit action failed: {e}")


@router.get("/documents/{document_id}/status")
async def get_document_status(document_id: str):
    """
    Get the current LangGraph execution status for a document.
    """
    try:
        config = {"configurable": {"thread_id": document_id}}
        state = clinical_graph.get_state(config)
        if not state or not state.values:
            raise HTTPException(status_code=404, detail=f"No active session for document {document_id}")
            
        state_values = state.values
        return {
            "document_id": document_id,
            "status": state_values.get("status", "unknown"),
            "error_message": state_values.get("error_message")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Status check failed for {document_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Status check failed: {e}")


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
