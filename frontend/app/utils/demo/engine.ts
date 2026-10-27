/**
 * The static demo's stand-in for the FastAPI + LangGraph backend.
 *
 * Uploading a PDF runs the same stages as backend/app/Agents/clinical_graph.py, in the browser:
 *   parse_pdf -> extract_clinical -> scrub_phi -> index_document -> (pause for human review) -> finalize
 * Status values and their order match the real graph, so the workbench stepper behaves identically.
 */
import type {
  AuditActionResponse,
  ClinicalExtractionResponse,
  DocumentStatusResponse,
  HealthResponse,
  PaginatedAuditLogs,
  QueryResponse,
  UploadResponse,
} from "../api";
import { currentEmail } from "./authStore";
import { listAudit, recordAudit } from "./auditStore";
import { createTextChunks, type TextChunk } from "./chunker";
import { extractClinicalData, type DemoExtraction } from "./extraction";
import { extractPdfPages } from "./pdf";
import { cleanPhi } from "./phi";
import { answerQuestion, buildIndex, type RetrievalIndex } from "./retriever";

const SAMPLE_REPORT_URL = "/demo/sample-medical-report.pdf";
const STAGE_MS = 1100; // how long each graph node stays visible in the stepper
const MIN_TEXT_CHARS = 40;

interface Session {
  documentId: string;
  filename: string;
  status: string;
  errorMessage: string | null;
  extraction: DemoExtraction | null;
  scrubbedPages: string[];
  chunks: TextChunk[];
  index: RetrievalIndex | null;
  notice: string | null;
  charCount: number;
  phiCounts: Record<string, number>;
}

const sessions = new Map<string, Session>();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function requireSession(documentId: string): Session {
  const session = sessions.get(documentId);
  if (!session) throw new Error(`No active session for document ${documentId}`);
  return session;
}

function requireAuth() {
  if (!currentEmail()) throw new Error("Not authenticated");
}

const countPlaceholders = (text: string) => {
  const counts: Record<string, number> = {};
  for (const match of text.matchAll(/\[([A-Z_]+)\]/g)) counts[match[1]] = (counts[match[1]] ?? 0) + 1;
  return counts;
};

async function loadSamplePages(): Promise<string[]> {
  const response = await fetch(SAMPLE_REPORT_URL);
  const blob = await response.blob();
  return extractPdfPages(new File([blob], "sample-medical-report.pdf", { type: "application/pdf" }));
}

async function runGraph(session: Session, file: File) {
  try {
    // Node 1: parse_pdf
    let pages: string[];
    try {
      pages = await extractPdfPages(file);
    } catch (error) {
      session.status = "failed";
      session.errorMessage = `Parsing failed: ${error instanceof Error ? error.message : "unreadable PDF"}`;
      return;
    }
    if (pages.join("").trim().length < MIN_TEXT_CHARS) {
      // The live pipeline falls back to Tesseract OCR for scans. The browser cannot, so use the sample report.
      session.notice = `No selectable text layer was found in '${session.filename}'. The live pipeline would run Tesseract / Docling OCR here; this demo analyses the bundled sample report instead.`;
      pages = await loadSamplePages();
    }
    session.charCount = pages.join("\n").length;
    await sleep(STAGE_MS);
    session.status = "extracting";

    // Node 2: extract_clinical
    const rawText = pages.join("\n");
    session.extraction = extractClinicalData(rawText);
    await sleep(STAGE_MS);
    session.status = "scrubbing";

    // Node 3: scrub_phi
    const { name, ic_number } = session.extraction.demographics;
    session.scrubbedPages = pages.map((page) => cleanPhi(page, name, ic_number));
    session.phiCounts = countPlaceholders(session.scrubbedPages.join("\n"));
    await sleep(STAGE_MS);
    session.status = "indexing";

    // Node 4: index_document (chunk the de-identified text and build the retrieval index)
    session.chunks = createTextChunks(session.scrubbedPages);
    session.index = buildIndex(session.chunks);
    await sleep(STAGE_MS);

    // Interrupt before human_review
    session.status = "review_pending";
  } catch (error) {
    session.status = "failed";
    session.errorMessage = error instanceof Error ? error.message : "Unknown graph execution error";
  }
}

// ─── API surface (same contracts as the FastAPI routes) ────────────────────────

export async function upload(file: File): Promise<UploadResponse> {
  requireAuth();
  if (!file.name || !file.name.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are accepted. Please upload a .pdf file.");
  }
  await sleep(350);

  const documentId = crypto.randomUUID();
  const session: Session = {
    documentId,
    filename: file.name,
    status: "parsing",
    errorMessage: null,
    extraction: null,
    scrubbedPages: [],
    chunks: [],
    index: null,
    notice: null,
    charCount: 0,
    phiCounts: {},
  };
  sessions.set(documentId, session);
  void runGraph(session, file);

  return {
    document_id: documentId,
    num_chunks: 0,
    characters_extracted: 0,
    message: `Ingestion workflow successfully scheduled for '${file.name}'`,
  };
}

export async function status(documentId: string): Promise<DocumentStatusResponse> {
  requireAuth();
  const session = requireSession(documentId);
  return { document_id: documentId, status: session.status, error_message: session.errorMessage ?? undefined };
}

export async function extract(documentId: string): Promise<ClinicalExtractionResponse> {
  requireAuth();
  const session = requireSession(documentId);
  if (!session.extraction) {
    throw new Error(`Clinical data extraction failed: ${session.errorMessage ?? "Extraction data is missing"}`);
  }
  await sleep(900);
  return { document_id: documentId, ...structuredClone(session.extraction) };
}

export async function query(documentId: string, question: string): Promise<QueryResponse> {
  requireAuth();
  const session = requireSession(documentId);
  if (!session.index) throw new Error("This document is still being ingested. Try again in a moment.");
  await sleep(650 + Math.random() * 500);
  const result = answerQuestion(session.index, question);
  return { answer: result.answer, source_chunks: result.source_chunks, document_id: documentId };
}

type AuditPayload = {
  demographics?: { name?: string; icNumber?: string; gender?: string; age?: string; admissionDate?: string };
  mainDiagnosis?: { icd11_code?: string; diagnosis_text?: string; source?: string; confidence?: number };
  otherDiagnoses?: { icd11_code?: string; diagnosis_text?: string; source?: string; confidence?: number }[];
};

export async function auditAction(
  documentId: string,
  action: "approve" | "reject" | "escalate",
  payload?: AuditPayload,
): Promise<AuditActionResponse> {
  requireAuth();
  const session = requireSession(documentId);
  await sleep(500);

  // Apply the clinician's edits back onto the graph state, as POST /api/audit/action does.
  const editedFields: string[] = [];
  if (payload && session.extraction) {
    const extraction = session.extraction;
    if (payload.demographics) {
      const d = payload.demographics;
      extraction.demographics = {
        name: d.name ?? "",
        ic_number: d.icNumber ?? "",
        gender: d.gender ?? "",
        age: d.age ?? "",
        admission_date: d.admissionDate ?? "",
      };
      editedFields.push("demographics");
    }
    if (payload.mainDiagnosis) {
      const m = payload.mainDiagnosis;
      extraction.main_diagnosis = {
        icd11_code: m.icd11_code ?? "",
        diagnosis_text: m.diagnosis_text ?? "",
        source: m.source ?? "user",
        confidence: m.confidence ?? 1,
      };
      editedFields.push("main_diagnosis");
    }
    if (payload.otherDiagnoses) {
      extraction.other_diagnoses = payload.otherDiagnoses.map((d) => ({
        icd11_code: d.icd11_code ?? "",
        diagnosis_text: d.diagnosis_text ?? "",
        source: d.source ?? "user",
        confidence: d.confidence ?? 1,
      }));
      editedFields.push("other_diagnoses");
    }
  }

  // human_review -> finalize
  session.status = action === "escalate" ? "escalated" : `${action}d`;

  recordAudit(documentId, currentEmail() ?? "unknown", action, {
    edited_fields: editedFields,
    has_payload: payload !== undefined,
    action,
  });

  return { status: "success", message: `Action '${action}' processed. Status is now ${session.status}.` };
}

export async function auditLogs(page: number, limit: number): Promise<PaginatedAuditLogs> {
  requireAuth();
  await sleep(250);
  return listAudit(page, limit);
}

export async function health(): Promise<HealthResponse> {
  return {
    status: "healthy",
    services: {
      fastapi: "simulated in the browser",
      rag_service: "healthy",
      loaded_documents: String(sessions.size),
    },
    version: "0.1.0",
  };
}

/** Text shown on the "Extracted Layout Text" tab: the de-identified document the index was built from. */
export function documentText(documentId: string): string | null {
  const session = sessions.get(documentId);
  if (!session?.index) return null;

  const scrubbed = Object.entries(session.phiCounts)
    .map(([type, count]) => `${type} x${count}`)
    .join(", ");

  return [
    `--- Extracted Document: ${session.filename} ---`,
    `UUID: ${documentId}`,
    `Status: Paused at human_review node.`,
    ``,
    `${session.scrubbedPages.length} page(s), ${session.charCount} characters extracted, ${session.chunks.length} de-identified chunks indexed.`,
    `PHI scrubbed: ${scrubbed || "none detected"}`,
    ...(session.notice ? [``, `Note: ${session.notice}`] : []),
    ``,
    `Use the ARIF Assistant panel in the sidebar to ask questions about this report.`,
    ``,
    `--- De-identified text ---`,
    ``,
    session.scrubbedPages.map((page, i) => `[Page ${i + 1}]\n${page}`).join("\n\n"),
  ].join("\n");
}
