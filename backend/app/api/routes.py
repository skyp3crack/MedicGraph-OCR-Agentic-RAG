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
import json
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends, Request
from pydantic import BaseModel,EmailStr, field_validator
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.schemas.requests import QueryRequest
from app.schemas.responses import UploadResponse, QueryResponse, HealthResponse
from app.schemas.kkm_schemas import ClinicalExtractionResponse
from app.Services.rag_service import RAGService
from app.Services.extraction_service import ExtractionService
from app.config import get_settings
from app.Agents.clinical_graph import clinical_graph

# Database and Security integrations
from app.database import get_db
from app.models.models import User, AuditLog
from app.utils.auth_utils import get_current_user, hash_password, verify_password, encode_jwt, require_role

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["MedicGraph RAG"])

limiter = Limiter(key_func=get_remote_address)

# --- Authentication Schemas ---

class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    name: str


    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long.")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        return v


class SigninRequest(BaseModel):
    email: EmailStr
    password: str




# --- Authentication Endpoints ---

@router.post("/auth/signup")
async def signup(request: SignupRequest, db: Session = Depends(get_db)):
    """Register a new clinician account."""
    existing_user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="An account with this email already exists."
        )
    
    # Create new clinician user
    hashed_pwd = hash_password(request.password)
    user = User(
        email=request.email.lower().strip(),
        name=request.name.strip(),
        hashed_password=hashed_pwd,
        role="clinician"
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    # Generate JWT
    token = encode_jwt({"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }


@router.post("/auth/signin")
@limiter.limit("5/minute")
async def signin(request: Request, signin_data: SigninRequest, db: Session = Depends(get_db)):
    """Authenticate and sign in a clinician."""
    user = db.query(User).filter(User.email == signin_data.email.lower().strip()).first()
    if not user or not verify_password(signin_data.password, user.hashed_password):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password. Please try again."
        )
    
    # Generate JWT
    token = encode_jwt({"sub": user.email})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "name": user.name,
            "role": user.role
        }
    }

@router.post("/auth/refresh")
async def refresh_token(current_user: User = Depends(get_current_user)):
    """Issue a new JWT token from a valid, non-expired token."""
    new_token = encode_jwt({"sub": current_user.email})
    return {
        "access_token": new_token,
        "token_type": "bearer",
        "user": {
            "email": current_user.email,
            "name": current_user.name,
            "role": current_user.role
        }
    }

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
async def upload_pdf(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = None,
    current_user: User = Depends(get_current_user)
):
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
async def query_document(request: QueryRequest, current_user: User = Depends(get_current_user)):
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
async def extract_clinical_data(request: QueryRequest, current_user: User = Depends(get_current_user)):
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
async def audit_action(
    request: AuditActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
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
        
        edited_fields = []
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
                edited_fields.append("demographics")
            if "mainDiagnosis" in request.payload:
                md = request.payload["mainDiagnosis"]
                extraction["main_diagnosis"] = {
                    "icd11_code": md.get("icd11_code", ""),
                    "diagnosis_text": md.get("diagnosis_text", ""),
                    "source": md.get("source", "user"),
                    "confidence": md.get("confidence", 1.0)
                }
                edited_fields.append("main_diagnosis")
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
                edited_fields.append("other_diagnoses")
            update_data["extraction"] = extraction
            
        # Update thread state
        clinical_graph.update_state(config, update_data)
        
        # Resume workflow (invoke with None tells graph to proceed past interrupt)
        clinical_graph.invoke(None, config)
        
        final_state = clinical_graph.get_state(config)
        final_status = final_state.values.get("status", "review_pending") if final_state else "completed"
        
        # Record de-identified audit log (never logs PHI raw values)
        log_payload = {
            "edited_fields": edited_fields,
            "has_payload": request.payload is not None,
            "action": request.action
        }
        
        new_log = AuditLog(
            document_id=request.document_id,
            clinician_email=current_user.email,
            action=request.action,
            payload=json.dumps(log_payload)
        )
        db.add(new_log)
        db.commit()
        
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
async def get_document_status(document_id: str, current_user: User = Depends(get_current_user)):
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


@router.get("/audit/logs")
async def get_audit_logs(
    current_user: User = Depends(require_role("clinician", "admin")),
    db: Session = Depends(get_db)
):
    """Retrieve historical clinician audit action logs (strictly de-identified)."""
    try:
        logs = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).all()
        return [
            {
                "id": log.id,
                "document_id": log.document_id,
                "clinician_email": log.clinician_email,
                "action": log.action,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "payload": json.loads(log.payload) if log.payload else {}
            }
            for log in logs
        ]
    except Exception as e:
        logger.error(f"Failed to fetch audit logs: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit logs: {e}")


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
