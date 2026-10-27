/**
 * Structured clinical extraction for the static demo.
 *
 * The live backend prompts Gemini to return demographics, ICD-11 coded diagnoses and validation alerts
 * (backend/app/Services/extraction_service.py). A browser cannot call that model, so this module reads the
 * same fields from the report text with rules, and returns the same response shape.
 * The ICD-11 table is a small illustrative lookup, not a clinical coding tool.
 */
import type { DiagnosisEntry, PatientDemographics } from "../api";

export interface DemoExtraction {
  demographics: PatientDemographics;
  main_diagnosis: DiagnosisEntry;
  other_diagnoses: DiagnosisEntry[];
  validation_alerts: string[];
}

interface Condition {
  pattern: RegExp;
  code: string;
  label: string;
}

const CONDITIONS: Condition[] = [
  { pattern: /pneumonia/i, code: "CA40.Z", label: "Pneumonia, organism unspecified" },
  { pattern: /myocardial infarction|\bSTEMI\b|\bNSTEMI\b/i, code: "BA41.Z", label: "Acute myocardial infarction" },
  { pattern: /heart failure|cardiac failure/i, code: "BD11", label: "Heart failure" },
  { pattern: /hypertension|high blood pressure/i, code: "BA00", label: "Essential hypertension" },
  { pattern: /type (?:2|ii) diabetes|diabetes mellitus type 2|\bT2DM\b/i, code: "5A11", label: "Type 2 diabetes mellitus" },
  { pattern: /type (?:1|i) diabetes|\bT1DM\b/i, code: "5A10", label: "Type 1 diabetes mellitus" },
  { pattern: /chronic kidney disease|\bCKD\b|renal failure/i, code: "GB61.Z", label: "Chronic kidney disease" },
  { pattern: /\bCOPD\b|chronic obstructive/i, code: "CA22", label: "Chronic obstructive pulmonary disease" },
  { pattern: /asthma/i, code: "CA23", label: "Asthma" },
  { pattern: /hyperlipid|hypercholesterol|dyslipid/i, code: "5C80.Z", label: "Lipid metabolism disorder" },
  { pattern: /stroke|cerebral infarct/i, code: "8B11", label: "Cerebral ischaemic stroke" },
  { pattern: /urinary tract infection|\bUTI\b/i, code: "GC08", label: "Urinary tract infection" },
  { pattern: /appendicitis/i, code: "DB10", label: "Acute appendicitis" },
  { pattern: /gastroenteritis/i, code: "1A40", label: "Infectious gastroenteritis" },
  { pattern: /tuberculosis/i, code: "1B10", label: "Tuberculosis" },
  { pattern: /covid-19|sars-cov-2/i, code: "RA01.0", label: "COVID-19" },
];

const NEGATION = /\b(no|not|without|denies|negative|nil|absent|free of|ruled out)\b/i;
const FAMILY = /\b(father|mother|family|sibling|parent)\b/i;

const tidy = (value: string) => value.replace(/\s+/g, " ").replace(/^[:\-•\s]+|[\s]+$/g, "").trim();

function firstMatch(text: string, patterns: RegExp[]): string {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) return tidy(match[1]);
  }
  return "";
}

function extractDemographics(text: string): PatientDemographics {
  const name = firstMatch(text, [
    /Nama pesakit\s*:?\s*([^\n]+?)\s*\n\s*Name of patient/i,
    /(?:Patient(?:'s)? Name|Name of Patient)\s*[:\-]\s*([^\n]+)/i,
  ]);

  const ic = firstMatch(text, [/\b(\d{6}-\d{2}-\d{4})\b/]);

  let gender = "";
  if (/Lelaki\s*X/i.test(text)) gender = "Male";
  else if (/Perempuan\s*X/i.test(text)) gender = "Female";
  else {
    const found = firstMatch(text, [/(?:Sex|Gender|Jantina)[\s:]*(Male|Female|Lelaki|Perempuan)/i]);
    gender = /^(male|lelaki)$/i.test(found) ? "Male" : /^(female|perempuan)$/i.test(found) ? "Female" : "";
  }

  const age = firstMatch(text, [/(?:Umur|Age)[\s:]*(\d{1,3})\b/i]);

  const admission = firstMatch(text, [
    /(?:Tarikh masuk wad[^\n]*?|Date of admission[^\n]*?|Admission Date|Admitted on)[\s:]*(\d{4}-\d{2}-\d{2}(?:\s+\d{1,2}:\d{2}(?:\s*[AP]M)?)?)/i,
  ]);

  return {
    name: name.toUpperCase(),
    ic_number: ic,
    gender,
    age,
    admission_date: admission,
  };
}

function diagnosisSection(text: string): string {
  // "Diagnosis :" label, then the lines that follow until a blank line or the next label.
  const match = text.match(
    /(?:^|\n)[ \t]*Diagnosis[ \t]*\n?[ \t]*:[ \t]*\n?[ \t]*([^\n]+(?:\n(?![ \t]*\n|[ \t]*(?:Diagnosis|Rawatan|Treatment)\b)[^\n]+)*)/i,
  );
  return match ? tidy(match[1].replace(/[•●▪]/g, " ")) : "";
}

function isReportedCondition(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 70), index);
  return !NEGATION.test(before) && !FAMILY.test(before);
}

export function extractClinicalData(text: string): DemoExtraction {
  const demographics = extractDemographics(text);
  const alerts: string[] = [];

  // Main diagnosis: the stated Diagnosis section first, otherwise the first reported condition.
  const section = diagnosisSection(text);
  let main: DiagnosisEntry;
  const sectionHit = section ? CONDITIONS.find((c) => c.pattern.test(section)) : undefined;

  if (sectionHit) {
    main = {
      icd11_code: sectionHit.code,
      diagnosis_text: section.replace(/\.$/, "") + ".",
      source: "ai",
      confidence: 0.962,
    };
  } else {
    const hit = CONDITIONS.map((c) => ({ c, at: text.search(c.pattern) })).find(
      ({ at }) => at >= 0 && isReportedCondition(text, at),
    );
    if (hit) {
      main = { icd11_code: hit.c.code, diagnosis_text: hit.c.label, source: "ai", confidence: 0.78 };
      alerts.push(
        `No explicit Diagnosis section was found, so '${hit.c.code}' was inferred from the clinical narrative. Manual audit requested.`,
      );
    } else {
      main = {
        icd11_code: "UNMAPPED",
        diagnosis_text: section || "No diagnosis could be identified automatically. Enter the diagnosis and ICD-11 code manually.",
        source: "ai",
        confidence: 0,
      };
      alerts.push("No ICD-11 mapping could be derived from this report. Manual coding is required before submission.");
    }
  }

  // Secondary diagnoses: other conditions the report affirms (not negated, not family history).
  const others: DiagnosisEntry[] = [];
  for (const condition of CONDITIONS) {
    if (condition.code === main.icd11_code || others.some((o) => o.icd11_code === condition.code)) continue;
    const re = new RegExp(condition.pattern.source, condition.pattern.flags.replace("g", "") + "g");
    for (const match of text.matchAll(re)) {
      if (isReportedCondition(text, match.index ?? 0)) {
        others.push({ icd11_code: condition.code, diagnosis_text: condition.label, source: "ai", confidence: 0.85 });
        break;
      }
    }
    if (others.length >= 10) break; // SMRP caps secondary diagnoses at 10
  }

  // Validation alerts: gaps that need a human before the record can be submitted.
  if (!demographics.name) alerts.push("Patient name could not be read from the report header. Please complete it manually.");
  if (!demographics.ic_number) alerts.push("No Malaysian IC number was found in the report. Please complete it manually.");
  if (!demographics.admission_date) alerts.push("Admission date was not found. Please complete it manually.");
  if (/culture\s+(?:is\s+)?pending|culture pending/i.test(text)) {
    alerts.push(
      `Culture results are still pending, so organism-specific coding for '${main.icd11_code}' cannot be confirmed yet. Manual audit requested.`,
    );
  }
  if (main.confidence > 0 && main.confidence < 0.8 && alerts.length === 0) {
    alerts.push(`Low-confidence mapping for '${main.icd11_code}'. Manual audit requested.`);
  }

  return { demographics, main_diagnosis: main, other_diagnoses: others, validation_alerts: alerts };
}
