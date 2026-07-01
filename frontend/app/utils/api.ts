/**
 * API client to interact with the FastAPI backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface UploadResponse {
  document_id: string;
  num_chunks: number;
  characters_extracted: number;
  message: string;
}

export interface SourceChunk {
  content: string;
  metadata: Record<string, any>;
}

export interface QueryResponse {
  answer: string;
  source_chunks: SourceChunk[];
  document_id: string;
}

export interface HealthResponse {
  status: string;
  services: Record<string, string>;
  version: string;
}

/**
 * Upload a PDF file to the backend
 * @param file The PDF file to upload
 */
export async function uploadPdf(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to upload medical report PDF.");
  }

  return response.json();
}

/**
 * Query an ingested medical report PDF
 * @param documentId The UUID of the document
 * @param question The natural-language query
 */
export async function queryDocument(
  documentId: string,
  question: string
): Promise<QueryResponse> {
  const response = await fetch(`${API_BASE_URL}/api/query`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document_id: documentId,
      question: question,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to retrieve answer from AI.");
  }

  return response.json();
}

/**
 * Fetch health status of the backend
 */
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`);
  if (!response.ok) {
    throw new Error("Backend service health check failed.");
  }
  return response.json();
}
