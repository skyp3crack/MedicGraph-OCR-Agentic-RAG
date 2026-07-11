"""
Integration Test for LangGraph Clinical State Graph.
Requires GEMINI_API_KEY. Run with: pytest -m integration
"""

import pytest
import os
import uuid
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Skip entire module if no real API key is set
pytestmark = pytest.mark.integration

from app.Agents.clinical_graph import clinical_graph


@pytest.mark.skipif(
    os.environ.get("GEMINI_API_KEY", "test_mock_key") == "test_mock_key",
    reason="Requires real GEMINI_API_KEY for LLM calls"
)
def test_full_clinical_pipeline():
    # 1. Define document details
    pdf_file_name = "1.FORMAT-LAPORAN-PERUBATAN-1-2024-9-MOCK1.pdf"
    pdf_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", pdf_file_name))
    
    if not os.path.exists(pdf_path):
        pytest.fail(f"Test PDF does not exist at {pdf_path}")

    document_id = str(uuid.uuid4())
    logger.info(f"Starting LangGraph test run for document: {document_id}")

    config = {"configurable": {"thread_id": document_id}}
    initial_state = {
        "document_id": document_id,
        "pdf_path": pdf_path,
        "raw_text": "",
        "scrubbed_text": "",
        "extraction": {},
        "audit_action": None,
        "status": "parsing",
        "error_message": None,
        "num_chunks": 0
    }

    # 2. Invoke graph (will execute nodes up to human_review node pause)
    logger.info("--- Stage 1: Running graph pipeline up to human review interrupt ---")
    clinical_graph.invoke(initial_state, config)

    # 3. Verify the state at the interrupt
    state = clinical_graph.get_state(config)
    if not state or not state.values:
        pytest.fail("Failed to retrieve state after invoke!")

    state_values = state.values
    logger.info(f"Graph execution paused. Current Status: {state_values.get('status')}")
    
    # Assertions
    assert state_values.get("status") == "review_pending", f"Expected review_pending, got {state_values.get('status')}"
    assert len(state_values.get("raw_text", "")) > 0, "Raw text is empty"
    assert len(state_values.get("scrubbed_text", "")) > 0, "Scrubbed text is empty"
    
    extraction = state_values.get("extraction", {})
    assert extraction, "Extraction dictionary is empty"
    
    demographics = extraction.get("demographics", {})
    logger.info(f"Extracted Demographics: {demographics}")
    assert demographics.get("name") == "AHMAD BIN HASSAN", f"Expected 'AHMAD BIN HASSAN', got {demographics.get('name')}"
    
    main_diagnosis = extraction.get("main_diagnosis", {})
    logger.info(f"Extracted Main Diagnosis: {main_diagnosis}")
    assert main_diagnosis.get("icd11_code"), "Missing ICD-11 code"

    # Confirm de-identification (PHI Scrubbing)
    scrubbed_text = state_values.get("scrubbed_text", "")
    assert "[PATIENT_NAME]" in scrubbed_text or "[PATIENT_NAME_PART]" in scrubbed_text, "Patient name was not scrubbed"
    assert "[IC_NUMBER]" in scrubbed_text, "Patient IC number was not scrubbed"
    logger.info("PHI Scrubbing validation: SUCCESS")

    # 4. Simulate human clinician action: APPROVE
    logger.info("--- Stage 2: Simulating human review APPROVE action ---")
    
    # Update thread state with human approval
    clinical_graph.update_state(config, {"audit_action": "approve"})
    
    # Resume graph execution (invoking with input=None resumes from pause)
    clinical_graph.invoke(None, config)

    # 5. Verify finalized state
    final_state = clinical_graph.get_state(config)
    if not final_state or not final_state.values:
        pytest.fail("Failed to retrieve state after resuming!")

    final_values = final_state.values
    logger.info(f"Final Graph Status: {final_values.get('status')}")
    assert final_values.get("status") == "approved", f"Expected approved, got {final_values.get('status')}"

    logger.info("LangGraph state machine test completed: SUCCESS")
