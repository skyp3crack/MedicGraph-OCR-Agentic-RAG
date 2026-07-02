"use client";

import React, { useState, useEffect } from "react";
import { Select, SelectTrigger, SelectValue, SelectPopover, ListBox, ListBoxItem, Label, TextField, InputGroup, Button, Card, CardContent, Chip, Spinner } from "@heroui/react";

export interface ICD11Entry {
  icd11_code: string;
  diagnosis_text: string;
  source?: "ai" | "static" | "user";
  confidence?: number;
}

export interface Demographics {
  name: string;
  icNumber: string;
  gender: string;
  age: string;
  admissionDate: string;
}

export interface HITLData {
  demographics: Demographics;
  mainDiagnosis: ICD11Entry;
  otherDiagnoses: ICD11Entry[];
  validationAlerts: string[];
}

interface HITLDashboardProps {
  data: HITLData;
  onApprove: (data: HITLData) => void;
  onReject: () => void;
  onEscalate: () => void;
  isLoading?: boolean;
}

export default function HITLDashboard({
  data,
  onApprove,
  onReject,
  onEscalate,
  isLoading = false,
}: HITLDashboardProps) {
  const [demographics, setDemographics] = useState<Demographics>({ ...data.demographics });
  const [mainDiagnosis, setMainDiagnosis] = useState<ICD11Entry>({ ...data.mainDiagnosis });
  const [otherDiagnoses, setOtherDiagnoses] = useState<ICD11Entry[]>([
    ...data.otherDiagnoses.map((d) => ({ ...d })),
  ]);

  useEffect(() => {
    setDemographics({ ...data.demographics });
    setMainDiagnosis({ ...data.mainDiagnosis });
    setOtherDiagnoses(data.otherDiagnoses.map((d) => ({ ...d })));
  }, [data]);

  const handleDemographicsChange = (field: keyof Demographics, value: string) => {
    setDemographics((prev) => ({ ...prev, [field]: value }));
  };

  const handleMainDiagnosisChange = (field: keyof ICD11Entry, value: string) => {
    setMainDiagnosis((prev) => ({ ...prev, [field]: value }));
  };

  const handleOtherDiagnosisChange = (index: number, field: keyof ICD11Entry, value: string) => {
    const updated = [...otherDiagnoses];
    updated[index] = { ...updated[index], [field]: value, source: "user" };
    setOtherDiagnoses(updated);
  };

  const handleAddSecondaryDiagnosis = () => {
    setOtherDiagnoses((prev) => [
      ...prev,
      { icd11_code: "NEW_CODE", diagnosis_text: "Describe diagnosis...", source: "user" },
    ]);
  };

  const handleRemoveSecondaryDiagnosis = (index: number) => {
    setOtherDiagnoses((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApproveClick = () => {
    onApprove({
      demographics,
      mainDiagnosis,
      otherDiagnoses,
      validationAlerts: data.validationAlerts,
    });
  };

  if (isLoading) {
    return (
      <section className="w-full md:w-[55%] bg-white flex flex-col h-full items-center justify-center p-6 border-l border-outline-variant">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <Spinner size="lg" />
          <h2 className="text-lg font-bold text-primary font-headline-md mt-2">Extracting Clinical Data</h2>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Running LLM-powered structured extraction to map patient demographics, clinical assessments, and ICD-11 coding schemas according to Malaysian KKM SMRP protocols.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="w-full md:w-[55%] bg-white flex flex-col h-full overflow-hidden">
      {/* TopAppBar Context */}
      <div className="flex justify-between items-center w-full px-6 py-4 bg-surface border-b border-outline-variant flex-shrink-0">
        <div className="flex flex-col">
          <span className="font-headline-md text-headline-md font-bold text-primary">
            Validation Workbench
          </span>
          <span className="text-[10px] text-on-surface-variant font-medium">
            Batch #B-992-KKM-2024
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button className="p-1.5 text-on-surface-variant hover:text-primary transition-transform active:scale-90 cursor-pointer rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="p-1.5 text-on-surface-variant hover:text-primary transition-transform active:scale-90 cursor-pointer rounded-lg flex items-center justify-center">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
          <Button
            variant="primary"
            size="sm"
            onPress={handleApproveClick}
            className="font-bold text-xs shadow-sm h-9 px-4 hidden sm:flex"
          >
            Approve Batch
          </Button>
        </div>
      </div>

      {/* Dynamic Content Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 md:space-y-8 scrollbar-hide">
        {/* A. ACTIVE PROGRESS TRACKER (LangGraph) */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-title-sm text-title-sm text-on-surface flex items-center gap-2 font-bold">
              <span className="material-symbols-outlined text-primary">hub</span>
              LangGraph Execution State
            </h3>
            <span className="text-[10px] font-bold text-primary uppercase bg-primary-fixed px-2 py-0.5 rounded">
              Real-time Node
            </span>
          </div>
          <div className="relative flex items-center justify-between px-2">
            <div className="absolute h-0.5 bg-outline-variant w-[86%] left-[7%] -z-10 top-5"></div>
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-1 bg-white px-1">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-on-surface-variant text-center">Parsing Layout</span>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center gap-1 bg-white px-1">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-on-surface-variant text-center">Scrubbing PHI</span>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center gap-1 bg-white px-1">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-on-surface-variant text-center">Data Extraction</span>
            </div>
            {/* Step 4 (Active) */}
            <div className="flex flex-col items-center gap-1 bg-white px-1">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-primary text-primary flex items-center justify-center shadow-xs pulse-active">
                <span className="material-symbols-outlined text-sm">person_search</span>
              </div>
              <span className="text-[9px] md:text-[10px] font-bold text-primary text-center">Human Review</span>
            </div>
          </div>
        </section>

        {/* B. PATIENT DEMOGRAPHICS */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-title-sm text-title-sm text-on-surface font-bold">
              MyHDD Standard Ingestion Schema
            </h3>
            <span className="material-symbols-outlined text-slate-400 text-sm">info</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-surface-container-low p-4 rounded-xl border border-outline-variant shadow-xs">
            <TextField 
              name="name" 
              value={demographics.name} 
              onChange={(val) => handleDemographicsChange("name", val)}
              className="flex flex-col gap-1.5"
            >
              <Label className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-[0.05em]">
                Patient Name
              </Label>
              <InputGroup className="border-outline-variant h-10 min-h-10 bg-white focus-within:!border-primary border rounded px-3 flex items-center">
                <InputGroup.Input className="w-full h-full text-sm font-bold text-on-surface focus:outline-none" />
              </InputGroup>
            </TextField>
            <TextField 
              name="icNumber" 
              value={demographics.icNumber} 
              onChange={(val) => handleDemographicsChange("icNumber", val)}
              className="flex flex-col gap-1.5"
            >
              <Label className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-[0.05em]">
                ID Number (IC)
              </Label>
              <InputGroup className="border-outline-variant h-10 min-h-10 bg-white focus-within:!border-primary border rounded px-3 flex items-center">
                <InputGroup.Input className="w-full h-full text-sm font-mono text-on-surface focus:outline-none" />
              </InputGroup>
            </TextField>
            <Select
              selectedKey={demographics.gender}
              onSelectionChange={(key) => {
                handleDemographicsChange("gender", key?.toString() || "");
              }}
            >
              <Label className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-[0.05em] mb-1.5 block">
                Gender
              </Label>
              <SelectTrigger className="border-outline-variant h-10 min-h-10 bg-white focus-within:!border-primary px-3 rounded flex items-center justify-between w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectPopover className="bg-white border border-outline-variant rounded shadow-md z-50 min-w-[120px]">
                <ListBox>
                  <ListBoxItem id="Male" textValue="Male">Male</ListBoxItem>
                  <ListBoxItem id="Female" textValue="Female">Female</ListBoxItem>
                </ListBox>
              </SelectPopover>
            </Select>
            <TextField 
              name="age" 
              value={demographics.age} 
              onChange={(val) => handleDemographicsChange("age", val)}
              className="flex flex-col gap-1.5"
            >
              <Label className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-[0.05em]">
                Age
              </Label>
              <InputGroup className="border-outline-variant h-10 min-h-10 bg-white focus-within:!border-primary border rounded px-3 flex items-center">
                <InputGroup.Input className="w-full h-full text-sm font-mono text-on-surface focus:outline-none" />
              </InputGroup>
            </TextField>
            <div className="sm:col-span-2">
              <TextField 
                name="admissionDate" 
                value={demographics.admissionDate} 
                onChange={(val) => handleDemographicsChange("admissionDate", val)}
                className="flex flex-col gap-1.5"
              >
                <Label className="text-[11px] font-bold text-on-surface-variant/70 uppercase tracking-[0.05em]">
                  Admission Date
                </Label>
                <InputGroup className="border-outline-variant h-10 min-h-10 bg-white focus-within:!border-primary border rounded px-3 flex items-center">
                  <InputGroup.Input className="w-full h-full text-sm font-mono text-on-surface focus:outline-none" />
                </InputGroup>
              </TextField>
            </div>
          </div>
        </section>

        {/* C. CLINICAL CODING (KKM SMRP) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-title-sm text-title-sm text-on-surface font-bold">
              KKM SMRP Integration Module (PD301)
            </h3>
            <button
              onClick={handleAddSecondaryDiagnosis}
              className="text-primary text-[11px] font-bold flex items-center gap-1 hover:underline cursor-pointer focus:outline-none"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add Secondary Diagnosis
            </button>
          </div>

          {/* MAIN DIAGNOSIS */}
          <Card className="border-2 border-primary-fixed bg-primary/5 shadow-sm rounded-xl relative overflow-visible">
            <CardContent className="p-5 flex flex-col sm:flex-row gap-4 relative">
              <div className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold px-3 py-0.5 rounded-full shadow-xs">
                AI Generated • {mainDiagnosis.confidence ? `${(mainDiagnosis.confidence * 100).toFixed(1)}%` : "98.4%"} Confidence
              </div>
              <div className="flex flex-col gap-2 flex-shrink-0 mt-2 sm:mt-0">
                <div className="bg-primary text-white font-mono text-[18px] px-4 py-2.5 rounded-lg shadow-sm font-bold text-center">
                  {mainDiagnosis.icd11_code}
                </div>
                <input
                  type="text"
                  value={mainDiagnosis.icd11_code}
                  onChange={(e) => handleMainDiagnosisChange("icd11_code", e.target.value)}
                  className="w-20 border border-outline-variant bg-white p-1 rounded text-center text-xs font-mono focus:outline-none focus:border-primary"
                  placeholder="Code"
                />
              </div>
              <div className="flex-1 space-y-2 mt-1 sm:mt-0">
                <label className="font-label-caps text-label-caps text-primary block">
                  Main Diagnosis Description
                </label>
                <textarea
                  className="w-full border border-outline-variant rounded text-sm bg-white focus:outline-none focus:border-primary p-2"
                  rows={2}
                  value={mainDiagnosis.diagnosis_text}
                  onChange={(e) => handleMainDiagnosisChange("diagnosis_text", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* OTHER DIAGNOSES */}
          <div className="space-y-3.5">
            {otherDiagnoses.map((diag, index) => (
              <div
                key={index}
                className={`relative flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-xl border transition-all ${
                  diag.source === "user"
                    ? "bg-secondary-fixed/10 border-secondary/20"
                    : "bg-surface-container border-outline-variant"
                }`}
              >
                <div className="flex flex-row sm:flex-col gap-1 items-center sm:items-start flex-shrink-0">
                  <span className="font-mono text-sm font-bold bg-white text-on-surface px-3 py-1.5 border border-outline-variant rounded text-center min-w-[70px]">
                    {diag.icd11_code}
                  </span>
                  <input
                    type="text"
                    value={diag.icd11_code}
                    onChange={(e) => handleOtherDiagnosisChange(index, "icd11_code", e.target.value)}
                    className="w-16 border border-outline-variant bg-white p-0.5 rounded text-center text-[10px] font-mono focus:outline-none focus:border-secondary"
                    placeholder="Code"
                  />
                </div>
                <input
                  className="flex-1 text-sm font-medium text-on-surface bg-transparent border-none focus:ring-0 focus:outline-none p-0"
                  type="text"
                  value={diag.diagnosis_text}
                  onChange={(e) => handleOtherDiagnosisChange(index, "diagnosis_text", e.target.value)}
                />
                <div className="flex items-center justify-between sm:justify-end gap-2.5 mt-2 sm:mt-0">
                  <Chip
                    size="sm"
                    variant={diag.source === "user" ? "secondary" : "primary"}
                    className="font-bold text-[9px] uppercase h-6 px-2.5"
                  >
                    {diag.source === "user" ? "User Modified" : "AI Predicted"}
                  </Chip>
                  <button
                    onClick={() => handleRemoveSecondaryDiagnosis(index)}
                    className="text-red-500 hover:text-red-700 cursor-pointer p-1 rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center"
                  >
                    <span className="material-symbols-outlined text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* D. VALIDATION ALERTS */}
        {data.validationAlerts && data.validationAlerts.length > 0 && (
          <section className="bg-error-container/20 border-l-4 border-error p-4 rounded-r-xl flex gap-3 items-start">
            <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
            <div>
              <h4 className="font-bold text-error text-[13px]">SMRP Validation Flag: Rule Mismatch Detected</h4>
              {data.validationAlerts.map((alertText, index) => (
                <p key={index} className="text-[12px] text-on-surface-variant mt-1 leading-relaxed">
                  {alertText}
                </p>
              ))}
            </div>
          </section>
        )}
        <div className="h-24"></div> {/* Spacer for sticky footer */}
      </div>

      {/* E. FOOTER (Sticky) */}
      <div className="mt-auto bg-white border-t border-outline-variant px-6 py-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.03)] flex-shrink-0">
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
          <Button
            variant="outline"
            onPress={onReject}
            className="font-bold text-xs h-10 border-error text-error hover:bg-error/5"
          >
            Reject / Re-run
          </Button>
          <Button
            variant="outline"
            onPress={onEscalate}
            className="border-outline text-on-surface-variant font-bold text-xs h-10"
          >
            Escalate Node
          </Button>
        </div>
        <Button
          variant="primary"
          onPress={handleApproveClick}
          className="font-bold text-sm w-full sm:w-auto shadow-md h-10 flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-[16px]">send</span>
          <span>Approve &amp; Submit to SMRP Portal</span>
        </Button>
      </div>
    </section>
  );
}
