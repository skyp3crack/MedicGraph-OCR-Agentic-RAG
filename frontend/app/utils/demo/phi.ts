/**
 * PHI scrubbing for the static demo.
 * A line-for-line port of `clean_phi` in backend/app/Agents/clinical_graph.py.
 */

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const NAME_CONNECTORS = new Set(["BIN", "BINTI", "A/L", "A/P", "DEVI", "AL"]);

export function cleanPhi(text: string, name: string, icNumber: string): string {
  // 1. Patient name (case-insensitive), then each distinct name part
  if (name) {
    const parts = name
      .split(/\s+/)
      .map((p) => p.trim())
      .filter(Boolean)
      .sort((a, b) => b.length - a.length);

    text = text.replace(new RegExp(`\\b${escapeRegExp(name)}\\b`, "gi"), "[PATIENT_NAME]");

    for (const part of parts) {
      if (part.length > 2 && !NAME_CONNECTORS.has(part.toUpperCase())) {
        text = text.replace(new RegExp(`\\b${escapeRegExp(part)}\\b`, "gi"), "[PATIENT_NAME_PART]");
      }
    }
  }

  // 2. The patient's own IC number, with or without dashes
  if (icNumber) {
    text = text.replace(new RegExp(`\\b${escapeRegExp(icNumber)}\\b`, "g"), "[IC_NUMBER]");
    const stripped = icNumber.replace(/-/g, "").trim();
    if (stripped.length === 12) {
      text = text.replace(new RegExp(`\\b${escapeRegExp(stripped)}\\b`, "g"), "[IC_NUMBER]");
    }
  }

  // 3. Any Malaysian IC pattern
  text = text.replace(/\b\d{6}-\d{2}-\d{4}\b/g, "[IC_NUMBER]");
  text = text.replace(/\b\d{12}\b/g, "[IC_NUMBER]");

  // 4. Phone numbers
  text = text.replace(/\b(?:\+?6?01\d{1}-\d{7,8}|01\d{8,9})\b/g, "[PHONE_NUMBER]");

  // 5. Email addresses
  text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, "[EMAIL_ADDRESS]");

  // 6. Medical record and registration numbers
  text = text.replace(/\bMRN-\d{4}-\d{6}\b/g, "[MRN]");
  text = text.replace(/\bMRN-\d{7,10}\b/g, "[MRN]");
  text = text.replace(/\bREG-FULL-\d{4}-\d{4}\b/g, "[REGISTRATION_NO]");

  // 7. Street addresses
  text = text.replace(
    /\b(?:No\.?\s*\d+[A-Za-z]?,?\s*)?(?:Jalan|Lorong|Taman|Kampung|Persiaran|Lebuh)\s+[A-Za-z0-9\s/,.-]{3,50}/gi,
    "[ADDRESS]",
  );

  // 8. Postal codes followed by a state / territory
  text = text.replace(
    /\b\d{5}\s+(?:Kuala Lumpur|Selangor|Johor|Penang|Perak|Sabah|Sarawak|Melaka|Kedah|Kelantan|Pahang|Terengganu|Perlis|Negeri Sembilan|Putrajaya|Labuan)\b/gi,
    "[POSTAL_ADDRESS]",
  );

  // 9. Old-format IC numbers
  text = text.replace(/\b[A-Z]\d{6}\b/g, "[OLD_IC_NUMBER]");

  return text;
}
