"""
Clinical Graph — LangGraph workflow for orchestrating clinical PDF ingestion.

Processes PDF through:
OCR -> Clinical Extraction -> PHI Scrubbing -> Vector Indexing -> Human Review pause.
"""

import os
import re
import logging
from typing import TypedDict, Optional, Dict, Any, Union
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from app.Services.ocr_service import extract_text_from_pdf
from app.Services.extraction_service import ExtractionService
from app.Services.rag_service import RAGService

logger = logging.getLogger(__name__)


class ClinicalGraphState(TypedDict):
    document_id: str
    pdf_path: str
    raw_text: str
    scrubbed_text: str
    extraction: Dict[str, Any]  # demographics, main_diagnosis, other_diagnoses, validation_alerts
    audit_action: Optional[str]  # approve, reject, escalate
    status: str  # parsing, extracting, scrubbing, indexing, review_pending, approved, rejected, escalated
    error_message: Optional[str]


def clean_phi(text: str, name: str, ic_number: str) -> str:
    """
    Remove Patient Health Information (PHI) from raw clinical text.
    Replaces patient name, IC card number, phone, email, and MRN with placeholders.
    """
    # 1. Clean Patient Name (case insensitive, including name parts)
    if name:
        # Sort parts descending so longer parts match first (e.g. "Ahmad Bin Hassan" before "Ahmad")
        parts = [p.strip() for p in name.split() if p.strip()]
        parts.sort(key=len, reverse=True)
        
        # Replace full name
        escaped_name = re.escape(name)
        text = re.sub(rf"\b{escaped_name}\b", "[PATIENT_NAME]", text, flags=re.IGNORECASE)
        
        # Replace individual name parts
        for part in parts:
            if len(part) > 2 and part.upper() not in ["BIN", "BINTI", "A/L", "A/P", "DEVI", "AL"]:
                escaped_part = re.escape(part)
                text = re.sub(rf"\b{escaped_part}\b", "[PATIENT_NAME_PART]", text, flags=re.IGNORECASE)

    # 2. Clean Specific IC Number
    if ic_number:
        escaped_ic = re.escape(ic_number)
        text = re.sub(rf"\b{escaped_ic}\b", "[IC_NUMBER]", text)
        ic_stripped = ic_number.replace("-", "").strip()
        if len(ic_stripped) == 12:
            text = re.sub(rf"\b{re.escape(ic_stripped)}\b", "[IC_NUMBER]", text)

    # 3. Clean Generic Malaysian IC card number patterns
    text = re.sub(r"\b\d{6}-\d{2}-\d{4}\b", "[IC_NUMBER]", text)
    text = re.sub(r"\b\d{12}\b", "[IC_NUMBER]", text)

    # 4. Clean phone numbers (e.g. +6012-3456789, 0123456789)
    text = re.sub(r"\b(?:\+?6?01\d{1}-\d{7,8}|01\d{8,9})\b", "[PHONE_NUMBER]", text)

    # 5. Clean email addresses
    text = re.sub(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b", "[EMAIL_ADDRESS]", text)

    # 6. Clean Medical Record Numbers (MRNs)
    text = re.sub(r"\bMRN-\d{4}-\d{6}\b", "[MRN]", text)
    text = re.sub(r"\bMRN-\d{7,10}\b", "[MRN]", text)
    text = re.sub(r"\bREG-FULL-\d{4}-\d{4}\b", "[REGISTRATION_NO]", text)

    return text


# --- Graph Nodes ---

def parse_pdf_node(state: ClinicalGraphState) -> Dict[str, Any]:
    """Extract raw text from the medical report PDF."""
    pdf_path = state.get("pdf_path")
    logger.info(f"[ClinicalGraph] Node 'parse_pdf' running for {pdf_path}")
    try:
        raw_text = extract_text_from_pdf(pdf_path)
        return {
            "raw_text": raw_text,
            "status": "extracting",
            "error_message": None
        }
    except Exception as e:
        logger.error(f"[ClinicalGraph] parse_pdf failed: {e}")
        return {
            "status": "failed",
            "error_message": f"Parsing failed: {str(e)}"
        }


def extract_clinical_node(state: ClinicalGraphState) -> Dict[str, Any]:
    """Extract structured diagnostics and demographics from raw medical text."""
    logger.info("[ClinicalGraph] Node 'extract_clinical' running")
    raw_text = state.get("raw_text")
    if not raw_text:
        return {
            "status": "failed",
            "error_message": "Missing raw text in extract_clinical node"
        }
    try:
        # Use singleton instance or create local
        from app.api.routes import get_extraction_service
        extraction_service = get_extraction_service()
        extraction = extraction_service.extract(raw_text)
        return {
            "extraction": extraction,
            "status": "scrubbing",
            "error_message": None
        }
    except Exception as e:
        logger.error(f"[ClinicalGraph] extract_clinical failed: {e}")
        return {
            "status": "failed",
            "error_message": f"Clinical extraction failed: {str(e)}"
        }


def scrub_phi_node(state: ClinicalGraphState) -> Dict[str, Any]:
    """Filter Protected Health Information (PHI) out of the raw medical text."""
    logger.info("[ClinicalGraph] Node 'scrub_phi' running")
    raw_text = state.get("raw_text")
    extraction = state.get("extraction", {})
    demographics = extraction.get("demographics", {})
    
    name = demographics.get("name", "")
    ic_number = demographics.get("ic_number", "")
    
    try:
        scrubbed_text = clean_phi(raw_text, name, ic_number)
        return {
            "scrubbed_text": scrubbed_text,
            "status": "indexing",
            "error_message": None
        }
    except Exception as e:
        logger.error(f"[ClinicalGraph] scrub_phi failed: {e}")
        return {
            "status": "failed",
            "error_message": f"PHI scrubbing failed: {str(e)}"
        }


def index_document_node(state: ClinicalGraphState) -> Dict[str, Any]:
    """Index scrubbed layout text in ChromaDB vector store."""
    logger.info("[ClinicalGraph] Node 'index_document' running")
    document_id = state.get("document_id")
    scrubbed_text = state.get("scrubbed_text")
    pdf_path = state.get("pdf_path")
    
    try:
        from app.api.routes import get_rag_service
        rag_service = get_rag_service()
        # Ingest de-identified text instead of original PDF
        rag_service.ingest_scrubbed_text(
            document_id=document_id,
            scrubbed_text=scrubbed_text,
            pdf_path=pdf_path
        )
        return {
            "status": "review_pending",
            "error_message": None
        }
    except Exception as e:
        logger.error(f"[ClinicalGraph] index_document failed: {e}")
        return {
            "status": "failed",
            "error_message": f"Indexing failed: {str(e)}"
        }


def human_review_node(state: ClinicalGraphState) -> Dict[str, Any]:
    """
    Pause execution point for Clinician validation review.
    This node serves as the interrupt target.
    """
    logger.info(f"[ClinicalGraph] Node 'human_review' entered. audit_action={state.get('audit_action')}")
    action = state.get("audit_action")
    if action in ["approve", "reject", "escalate"]:
        return {
            "status": f"{action}d" if action != "escalate" else "escalated",
            "error_message": None
        }
    return {
        "status": "review_pending"
    }


def finalize_node(state: ClinicalGraphState) -> Dict[str, Any]:
    """Wrap up graph execution state after audit decisions."""
    action = state.get("audit_action")
    status = f"{action}d" if action != "escalate" else "escalated"
    logger.info(f"[ClinicalGraph] Workflow finished. Final status={status}")
    return {
        "status": status
    }


# --- Conditional Routing Rules ---

def route_after_parse(state: ClinicalGraphState) -> str:
    if state.get("status") == "failed":
        return END
    return "extract_clinical"

def route_after_extract(state: ClinicalGraphState) -> str:
    if state.get("status") == "failed":
        return END
    return "scrub_phi"

def route_after_scrub(state: ClinicalGraphState) -> str:
    if state.get("status") == "failed":
        return END
    return "index_document"

def route_after_index(state: ClinicalGraphState) -> str:
    if state.get("status") == "failed":
        return END
    return "human_review"

def route_after_review(state: ClinicalGraphState) -> str:
    action = state.get("audit_action")
    if action in ["approve", "reject", "escalate"]:
        return "finalize"
    return "human_review"


# --- Compile Workflow Graph ---

workflow = StateGraph(ClinicalGraphState)

# Add Nodes
workflow.add_node("parse_pdf", parse_pdf_node)
workflow.add_node("extract_clinical", extract_clinical_node)
workflow.add_node("scrub_phi", scrub_phi_node)
workflow.add_node("index_document", index_document_node)
workflow.add_node("human_review", human_review_node)
workflow.add_node("finalize", finalize_node)

# Add Edges
workflow.add_edge(START, "parse_pdf")

workflow.add_conditional_edges("parse_pdf", route_after_parse, {
    "extract_clinical": "extract_clinical",
    END: END
})
workflow.add_conditional_edges("extract_clinical", route_after_extract, {
    "scrub_phi": "scrub_phi",
    END: END
})
workflow.add_conditional_edges("scrub_phi", route_after_scrub, {
    "index_document": "index_document",
    END: END
})
workflow.add_conditional_edges("index_document", route_after_index, {
    "human_review": "human_review",
    END: END
})
workflow.add_conditional_edges("human_review", route_after_review, {
    "finalize": "finalize",
    "human_review": "human_review"
})
workflow.add_edge("finalize", END)

# Set up in-memory checkpointer to persist thread history
memory_checkpointer = MemorySaver()

# Compile graph with interrupt right before clinician review
clinical_graph = workflow.compile(
    checkpointer=memory_checkpointer,
    interrupt_before=["human_review"]
)
