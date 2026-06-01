"""
Pydantic response models for the MedicGraph API.
"""

from pydantic import BaseModel, Field


class UploadResponse(BaseModel):
    """Response body for the /api/upload endpoint."""

    document_id: str = Field(
        ...,
        description="UUID assigned to the ingested document"
    )
    num_chunks: int = Field(
        ...,
        description="Number of text chunks created from the document"
    )
    characters_extracted: int = Field(
        ...,
        description="Total characters extracted from the PDF"
    )
    message: str = Field(
        default="Document ingested successfully",
        description="Human-readable status message"
    )


class SourceChunk(BaseModel):
    """A single source chunk used to ground the LLM's answer."""

    content: str = Field(
        ...,
        description="Text content of the source chunk"
    )
    metadata: dict = Field(
        default_factory=dict,
        description="Metadata associated with the chunk"
    )


class QueryResponse(BaseModel):
    """Response body for the /api/query endpoint."""

    answer: str = Field(
        ...,
        description="LLM-generated answer grounded in the document context"
    )
    source_chunks: list[SourceChunk] = Field(
        default_factory=list,
        description="Source chunks retrieved from the vector store that grounded the answer"
    )
    document_id: str = Field(
        ...,
        description="UUID of the document that was queried"
    )


class HealthResponse(BaseModel):
    """Response body for the /api/health endpoint."""

    status: str = Field(
        default="healthy",
        description="Overall service health status"
    )
    services: dict[str, str] = Field(
        default_factory=dict,
        description="Individual service component statuses"
    )
    version: str = Field(
        default="0.1.0",
        description="API version"
    )
