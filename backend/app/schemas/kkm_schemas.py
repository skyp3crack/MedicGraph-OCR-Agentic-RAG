from typing import List,Optional
from pydantic import BaseModel, Field #for type hinting and validation

#EXTRACTION AGENT SCHEMAS (Clinical Structuring via MyHDD)
class VitalSigns(BaseModel):
    blood_pressuremmHg: Optional[str] = Field(None,description="Systolic/Diastolic blood pressure reading, e.g,'120/80'")
    heart_rate_bpm: Optional[int] = Field(None,description= "Heart rate measured in beats per minute")

class PatientAssessment(BaseModel):
    chief_complaint: str = Field(...,description="The primary symptom or reason the patient sought care.")
    history_of_present_illness:str = Field(..., description="Chronological narrative of the patient's illness.")
    vital_signs: Optional[VitalSigns]=Field(None, description="Patient physiological metrics.")
    clinical_findings : List[str] = Field(default_factory=list, description="Objective observations from physical exams.")

class WorkingDiagnosesMyHDD(BaseModel):
    principal_diagnosis: str = Field(..., description="The condition chiefly responsible for occasioning the encounter.")
    other_diagnosis: List[str] = Field(default_factory=list, description="Co-existing conditions treated during this timeline.")
    complication_diagnosis: List[str] = Field(default_factory=list, description="Conditions arising during the hospital stay.")

class MedicalRecordPayload(BaseModel):
    """Output schema for Node 3: The Extraction & Structuring Agent"""
    original_document: str = Field(..., description="Clean copy of the source markdown post-PHI redaction.")
    patient_assessment: PatientAssessment = Field(..., description="MyHDD structured assessment block.")
    working_diagnoses: WorkingDiagnosesMyHDD = Field(..., description="MyHDD categorical taxonomy diagnosis matrix.")
    management_plan: List[str] = Field(default_factory=list, description="List of therapeutic interventions or diagnostic testing planned.")   

#Coding Agent Schemas (SMRP ICD-11 Mapping - PD301 Compliant)
class ICD11CodingEntry(BaseModel):
    diagnosis_text: str = Field(..., description="The literal clinical narrative phrase from the note.")
    icd11_code: str = Field(..., description="The exact alphanumeric WHO ICD-11 MMS code.")

class SmrpIcd11CodingPayload(BaseModel):
    # KKM RULE: SMRP mandates exactly ONE Main Diagnosis. Max length enforced.
    main_diagnosis: List[ICD11CodingEntry] = Field(..., min_length=1, max_length=1, description="Exactly 1 primary diagnosis allowed.")
    # KKM RULE: Secondary categories capped at 10 items for SMRP integration.
    other_diagnosis: List[ICD11CodingEntry] = Field(default_factory=list, max_length=10, description="Pre-existing or secondary conditions. Max 10.")
    complication_diagnosis: List[ICD11CodingEntry] = Field(default_factory=list, max_length=10, description="Anomalous issues triggered during treatment. Max 10.")
    external_causes_of_morbidity: List[ICD11CodingEntry] = Field(default_factory=list, max_length=10, description="External incidents causing the condition. Max 10.")

class KkmSmrpIntegrationContainer(BaseModel):
    """Output schema for Node 4: The Coding & RAG Agent"""
    smrp_icd11_coding: SmrpIcd11CodingPayload = Field(..., description="PD301 module integration payload.")