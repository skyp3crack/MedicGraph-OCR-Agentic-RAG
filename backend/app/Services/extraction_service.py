"""
Extraction Service — Uses Gemini to parse unstructured medical text into
KKM MyHDD demographics and SMRP ICD-11 coding schemas.

NOTE: langchain-google-genai v1.0.10 does not support nested Pydantic models
with `with_structured_output`. We use explicit JSON-mode prompting and manual
Pydantic validation instead.
"""

import json
import logging
import re

from langchain_core.prompts import ChatPromptTemplate
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.schemas.kkm_schemas import DiagnosisEntry, PatientDemographics

logger = logging.getLogger(__name__)


EXTRACTION_SYSTEM_PROMPT = (
    "You are an expert clinical coding auditor specializing in Ministry of Health Malaysia (KKM) standards "
    "and SMRP ICD-11 transition protocols. Your task is to analyze the provided clinical document and extract "
    "structured patient demographics, the primary diagnosis mapped to a valid ICD-11 code, and any secondary "
    "or complication diagnoses.\n\n"
    "Follow these strict clinical protocols:\n"
    "1. Demographics:\n"
    "   - Extract name (convert to uppercase), age, gender, and admission date/time from the report headers.\n"
    "   - Extract the Malaysian IC (Identity Card) Number. Format: YYMMDD-PB-###G (e.g. 840921-14-5583).\n"
    "2. Diagnoses & ICD-11 Codes:\n"
    "   - Primary Diagnosis: Identify the single chief condition responsible for the patient's admission. Map it to a valid ICD-11 code (e.g., '5A11' for kidney nephropathy, 'BA41' for myocardial infarction).\n"
    "   - Secondary / Other Diagnoses: List any co-existing or secondary conditions treated or reported.\n"
    "   - Verify that all codes follow the standard alphanumeric format (e.g., 5A11, BA41.1, ED90.1).\n"
    "3. Validation Alerts:\n"
    "   - Analyze the clinical findings, laboratory test values, and diagnosis text to detect anomalies.\n"
    "   - Generate clear warnings if there are inconsistencies, such as a diagnosis mismatching the clinical notes (e.g., diagnosing nephritis without renal symptoms/kidney function records), or if manual audit is recommended.\n\n"
    "IMPORTANT: You MUST respond with ONLY a valid JSON object (no markdown, no code fences, no explanation).\n"
    "Use this exact JSON structure:\n"
    "{{\n"
    '  "demographics": {{\n'
    '    "name": "PATIENT NAME IN UPPERCASE",\n'
    '    "ic_number": "YYMMDD-PB-####",\n'
    '    "gender": "Male or Female",\n'
    '    "age": "age as string",\n'
    '    "admission_date": "date/time string"\n'
    "  }},\n"
    '  "main_diagnosis": {{\n'
    '    "icd11_code": "CODE",\n'
    '    "diagnosis_text": "description",\n'
    '    "source": "ai",\n'
    '    "confidence": 0.95\n'
    "  }},\n"
    '  "other_diagnoses": [\n'
    '    {{"icd11_code": "CODE", "diagnosis_text": "description", "source": "ai", "confidence": 0.9}}\n'
    "  ],\n"
    '  "validation_alerts": ["alert message 1"]\n'
    "}}"
)


class ExtractionService:
    """Service to extract structured patient information and ICD-11 codes from clinical text."""

    def __init__(self):
        settings = get_settings()
        self._llm = ChatGoogleGenerativeAI(
            model=settings.llm_model,
            google_api_key=settings.gemini_api_key,
            temperature=0.0,
        )

        self._prompt = ChatPromptTemplate.from_messages([
            ("system", EXTRACTION_SYSTEM_PROMPT),
            ("human", "Clinical Record Text:\n{text}"),
        ])

        logger.info(f"ExtractionService initialized (LLM={settings.llm_model})")

    def extract(self, text: str) -> dict:
        """
        Extract structured demographics and diagnoses from raw medical text.

        Args:
            text: Raw clinical text from OCR extraction.

        Returns:
            Dictionary matching the ClinicalExtractionResponse schema.
        """
        logger.info(f"Running clinical extraction on text of length {len(text)}")

        formatted_messages = self._prompt.format_messages(text=text)

        try:
            response = self._llm.invoke(formatted_messages)
            raw_content = response.content

            # Strip markdown code fences if present
            cleaned = raw_content.strip()
            cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
            cleaned = re.sub(r"\s*```$", "", cleaned)
            cleaned = cleaned.strip()

            parsed = json.loads(cleaned)

            # Validate with Pydantic models
            demographics = PatientDemographics(**parsed["demographics"])
            main_diagnosis = DiagnosisEntry(**parsed["main_diagnosis"])
            other_diagnoses = [DiagnosisEntry(**d) for d in parsed.get("other_diagnoses", [])]
            validation_alerts = parsed.get("validation_alerts", [])

            return {
                "demographics": demographics.model_dump(),
                "main_diagnosis": main_diagnosis.model_dump(),
                "other_diagnoses": [d.model_dump() for d in other_diagnoses],
                "validation_alerts": validation_alerts,
            }
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse LLM JSON output: {e}\nRaw output: {raw_content}")
            raise RuntimeError(f"LLM returned invalid JSON: {e}") from e
        except Exception as e:
            logger.error(f"Clinical extraction failed: {e}")
            raise RuntimeError(f"Failed to extract structured clinical data: {e}") from e

