"""
Pydantic request models for the MedicGraph API.
"""

from pydantic import BaseModel, Field


class QueryRequest(BaseModel):
    """Request body for the /api/query endpoint."""

    document_id: str = Field(
        ...,
        description="UUID of the ingested document to query against",
        examples=["550e8400-e29b-41d4-a716-446655440000"],
    )
    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="Natural-language question about the medical report",
        examples=["What is the patient's diagnosis?"],
    )
