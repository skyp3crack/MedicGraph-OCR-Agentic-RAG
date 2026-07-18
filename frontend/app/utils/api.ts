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

export interface PatientDemographics {
  name: string;
  ic_number: string;
  gender: string;
  age: string;
  admission_date: string;
}

export interface DiagnosisEntry {
  icd11_code: string;
  diagnosis_text: string;
  source: string;
  confidence: number;
}

export interface ClinicalExtractionResponse {
  document_id: string;
  demographics: PatientDemographics;
  main_diagnosis: DiagnosisEntry;
  other_diagnoses: DiagnosisEntry[];
  validation_alerts: string[];
}

export interface AuditActionResponse {
  status: string;
  message: string;
}

export interface HealthResponse {
  status: string;
  services: Record<string, string>;
  version: string;
}

export interface AuthUser {
  email: string;
  name: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface AuditLogEntry {
  id: number;
  document_id: string;
  clinician_email: string;
  action: string;
  timestamp: string;
  payload: {
    edited_fields?: string[];
    has_payload?: boolean;
    action?: string;
  };
}

/**
 * Get headers including Authorization JWT token if available.
 */
function getHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = { ...extraHeaders };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("medicograph_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }
  return headers;
}

/**
 * Call backend sign in endpoint
 */
export async function loginApi(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signin`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Invalid email or password.");
  }

  return response.json();
}

/**
 * Call backend sign up endpoint
 */
export async function signupApi(email: string, password: string, name: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password, name }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to create account.");
  }

  return response.json();
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
    headers: getHeaders(),
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
    headers: getHeaders({
      "Content-Type": "application/json",
    }),
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

/**
 * Extract structured clinical data from an ingested PDF report
 * @param documentId The UUID of the document
 */
export async function extractClinicalData(
  documentId: string
): Promise<ClinicalExtractionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/extract`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      document_id: documentId,
      question: "extract", // backend endpoint expects QueryRequest which requires a 'question' parameter
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to extract structured clinical data.");
  }

  return response.json();
}

/**
 * Submit HITL auditor action to backend
 * @param documentId The UUID of the document
 * @param action The action taken ('approve' | 'reject' | 'escalate')
 * @param payload Optional payload (e.g. corrected demographics/diagnoses)
 */
export async function submitAuditAction(
  documentId: string,
  action: "approve" | "reject" | "escalate",
  payload?: any
): Promise<AuditActionResponse> {
  const response = await fetch(`${API_BASE_URL}/api/audit/action`, {
    method: "POST",
    headers: getHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      document_id: documentId,
      action: action,
      payload: payload,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to submit audit action: ${action}`);
  }

  return response.json();
}

export interface DocumentStatusResponse {
  document_id: string;
  status: string;
  error_message?: string;
}

/**
 * Get the current LangGraph workflow status for a document
 * @param documentId The UUID of the document
 */
export async function getDocumentStatus(
  documentId: string
): Promise<DocumentStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/status`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to retrieve document status.");
  }
  return response.json();
}

export interface PaginatedAuditLogs {
  total: number;
  page: number;
  limit: number;
  logs: AuditLogEntry[];
}

/**
 * Retrieve historical audit logs (secured, returns de-identified logs, paginated)
 */
export async function fetchAuditLogs(page = 1, limit = 20): Promise<PaginatedAuditLogs> {
  const response = await fetch(`${API_BASE_URL}/api/audit/logs?page=${page}&limit=${limit}`, {
    headers: getHeaders(),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || "Failed to retrieve audit logs.");
  }
  return response.json();
}

