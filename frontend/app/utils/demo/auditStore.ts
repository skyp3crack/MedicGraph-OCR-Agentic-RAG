/**
 * Audit log for the static demo (stand-in for the `audit_logs` SQLite table).
 * Entries are de-identified: they record the action and which sections were edited, never patient values.
 */
import type { AuditLogEntry, PaginatedAuditLogs } from "../api";

const LOG_KEY = "medicograph_demo_audit";

type Payload = AuditLogEntry["payload"];

function seed(): AuditLogEntry[] {
  const now = Date.now();
  const stamp = (hoursAgo: number) => new Date(now - hoursAgo * 3600_000).toISOString().replace("Z", "");
  const rows: [string, string, string, number, Payload][] = [
    ["c3a1f7d2-5b0e-4c1a-9d52-8e1f0a6b7c34", "admin@medicograph.dev", "approve", 3, { edited_fields: ["demographics", "main_diagnosis", "other_diagnoses"], has_payload: true, action: "approve" }],
    ["7be90d41-22a8-4f6c-b1e3-0c94d5a8e2f7", "dr.aisyah@medicograph.dev", "escalate", 7, { edited_fields: [], has_payload: false, action: "escalate" }],
    ["a05d6c83-91fe-47b2-8a30-d2c7e41f9b05", "admin@medicograph.dev", "approve", 22, { edited_fields: ["demographics", "main_diagnosis", "other_diagnoses"], has_payload: true, action: "approve" }],
    ["19f4e2b7-6d3c-4a85-b7e0-53a8c1d9f642", "dr.rahim@medicograph.dev", "reject", 27, { edited_fields: [], has_payload: false, action: "reject" }],
    ["e8c27a05-3f19-4d6b-a4c2-7b1d90e5f831", "dr.aisyah@medicograph.dev", "approve", 31, { edited_fields: ["demographics", "main_diagnosis", "other_diagnoses"], has_payload: true, action: "approve" }],
    ["52d0b9e6-a7c4-41f3-8e15-c6f2a3b80d97", "admin@medicograph.dev", "approve", 49, { edited_fields: ["demographics", "main_diagnosis", "other_diagnoses"], has_payload: true, action: "approve" }],
    ["f61a3c58-0e92-4b7d-9a4f-1d8e7c2b5a03", "dr.rahim@medicograph.dev", "escalate", 53, { edited_fields: [], has_payload: false, action: "escalate" }],
    ["04b8d7a2-c5e1-49f0-b36a-e92f1c7d8a54", "dr.aisyah@medicograph.dev", "reject", 72, { edited_fields: [], has_payload: false, action: "reject" }],
    ["9c3e5f10-7a24-4d8b-80c6-b5a1e3d70f92", "admin@medicograph.dev", "approve", 76, { edited_fields: ["demographics", "main_diagnosis", "other_diagnoses"], has_payload: true, action: "approve" }],
    ["2a7d4e91-b6f3-4c05-9e28-f0c83a5d1b76", "dr.rahim@medicograph.dev", "approve", 96, { edited_fields: ["demographics", "main_diagnosis", "other_diagnoses"], has_payload: true, action: "approve" }],
    ["d41b8f63-5e07-4a9c-b2d1-69c0a7e3f518", "admin@medicograph.dev", "escalate", 121, { edited_fields: [], has_payload: false, action: "escalate" }],
    ["6f90c2a8-1d45-4e37-a8b6-3e7f5d0c9a21", "dr.aisyah@medicograph.dev", "approve", 144, { edited_fields: ["demographics", "main_diagnosis", "other_diagnoses"], has_payload: true, action: "approve" }],
  ];
  return rows.map(([document_id, clinician_email, action, hoursAgo, payload], i) => ({
    id: rows.length - i,
    document_id,
    clinician_email,
    action,
    timestamp: stamp(hoursAgo),
    payload,
  }));
}

function load(): AuditLogEntry[] {
  try {
    const stored = JSON.parse(localStorage.getItem(LOG_KEY) ?? "null") as AuditLogEntry[] | null;
    if (stored) return stored;
  } catch {
    // fall through to seeding
  }
  const seeded = seed();
  save(seeded);
  return seeded;
}

function save(logs: AuditLogEntry[]) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(logs));
  } catch {
    // storage unavailable: the log lasts for this page view only
  }
}

export function recordAudit(documentId: string, clinicianEmail: string, action: string, payload: Payload) {
  const logs = load();
  const nextId = logs.reduce((max, l) => Math.max(max, l.id), 0) + 1;
  logs.unshift({
    id: nextId,
    document_id: documentId,
    clinician_email: clinicianEmail,
    action,
    timestamp: new Date().toISOString().replace("Z", ""),
    payload,
  });
  save(logs);
}

export function listAudit(page: number, limit: number): PaginatedAuditLogs {
  const logs = load().sort((a, b) => (b.timestamp ?? "").localeCompare(a.timestamp ?? ""));
  const start = (page - 1) * limit;
  return { total: logs.length, page, limit, logs: logs.slice(start, start + limit) };
}
