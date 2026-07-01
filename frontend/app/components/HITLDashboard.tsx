"use client";

import React, { useState } from "react";

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
}

export default function HITLDashboard({
  data,
  onApprove,
  onReject,
  onEscalate,
}: HITLDashboardProps) {
  const [demographics, setDemographics] = useState<Demographics>({ ...data.demographics });
  const [mainDiagnosis, setMainDiagnosis] = useState<ICD11Entry>({ ...data.mainDiagnosis });
  const [otherDiagnoses, setOtherDiagnoses] = useState<ICD11Entry[]>([
    ...data.otherDiagnoses.map((d) => ({ ...d })),
  ]);

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

  return (
    <section className="w-[55%] bg-white flex flex-col h-full overflow-hidden">
      {/* TopAppBar Context */}
      <div className="flex justify-between items-center w-full px-6 py-4 bg-surface border-b border-outline-variant">
        <div className="flex flex-col">
          <span className="font-headline-md text-headline-md font-bold text-primary">
            Validation Workbench
          </span>
          <span className="text-[10px] text-on-surface-variant font-medium">
            Batch #B-992-KKM-2024
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button className="text-on-surface-variant hover:text-primary transition-transform active:scale-90 cursor-pointer">
              <span className="material-symbols-outlined">notifications</span>
            </button>
            <button className="text-on-surface-variant hover:text-primary transition-transform active:scale-90 cursor-pointer">
              <span className="material-symbols-outlined">account_circle</span>
            </button>
          </div>
          <button
            onClick={handleApproveClick}
            className="bg-primary text-on-primary px-4 py-2 rounded font-title-sm text-title-sm hover:opacity-90 transition-transform active:scale-95 shadow-sm cursor-pointer"
          >
            Approve Batch
          </button>
        </div>
      </div>

      {/* Dynamic Content Scrollable Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
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
          <div className="relative flex items-center justify-between">
            <div className="absolute h-0.5 bg-outline-variant w-[90%] left-[5%] -z-10 top-5"></div>
            {/* Step 1 */}
            <div className="flex flex-col items-center gap-2 bg-white px-2">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant">Parsing Layout</span>
            </div>
            {/* Step 2 */}
            <div className="flex flex-col items-center gap-2 bg-white px-2">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant">Scrubbing PHI</span>
            </div>
            {/* Step 3 */}
            <div className="flex flex-col items-center gap-2 bg-white px-2">
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-xs">
                <span className="material-symbols-outlined text-sm">check</span>
              </div>
              <span className="text-[10px] font-bold text-on-surface-variant">Data Extraction</span>
            </div>
            {/* Step 4 (Active) */}
            <div className="flex flex-col items-center gap-2 bg-white px-2">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-primary text-primary flex items-center justify-center shadow-xs pulse-active">
                <span className="material-symbols-outlined text-sm">person_search</span>
              </div>
              <span className="text-[10px] font-bold text-primary">Human Verification</span>
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
          <div className="grid grid-cols-3 gap-3 bg-surface-container-low p-4 rounded-xl border border-outline-variant shadow-xs">
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant/60 block">
                Patient Name
              </label>
              <input
                className="w-full bg-white border border-outline-variant rounded p-2 text-sm font-bold focus:ring-primary focus:border-primary focus:outline-none"
                type="text"
                value={demographics.name}
                onChange={(e) => handleDemographicsChange("name", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant/60 block">
                ID Number (IC)
              </label>
              <input
                className="w-full bg-white border border-outline-variant rounded p-2 text-sm font-mono focus:ring-primary focus:border-primary focus:outline-none"
                type="text"
                value={demographics.icNumber}
                onChange={(e) => handleDemographicsChange("icNumber", e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant/60 block">
                Gender
              </label>
              <select
                className="w-full bg-white border border-outline-variant rounded p-2 text-sm focus:ring-primary focus:border-primary focus:outline-none"
                value={demographics.gender}
                onChange={(e) => handleDemographicsChange("gender", e.target.value)}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-label-caps text-label-caps text-on-surface-variant/60 block">
                Age
              </label>
              <input
                className="w-full bg-white border border-outline-variant rounded p-2 text-sm font-mono focus:ring-primary focus:border-primary focus:outline-none"
                type="text"
                value={demographics.age}
                onChange={(e) => handleDemographicsChange("age", e.target.value)}
              />
            </div>
            <div className="space-y-1 col-span-2">
              <label className="font-label-caps text-label-caps text-on-surface-variant/60 block">
                Admission Date
              </label>
              <input
                className="w-full bg-white border border-outline-variant rounded p-2 text-sm font-mono focus:ring-primary focus:border-primary focus:outline-none"
                type="text"
                value={demographics.admissionDate}
                onChange={(e) => handleDemographicsChange("admissionDate", e.target.value)}
              />
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
              className="text-primary text-[11px] font-bold flex items-center gap-1 hover:underline cursor-pointer"
            >
              <span className="material-symbols-outlined text-[14px]">add</span>
              Add Secondary Diagnosis
            </button>
          </div>

          {/* MAIN DIAGNOSIS */}
          <div className="relative border-2 border-primary-fixed p-5 rounded-xl bg-primary/5">
            <div className="absolute -top-3 right-4 bg-primary text-white text-[10px] font-bold px-3 py-0.5 rounded-full">
              AI Generated • {mainDiagnosis.confidence ? `${(mainDiagnosis.confidence * 100).toFixed(1)}%` : "98.4%"} Confidence
            </div>
            <div className="flex items-start gap-4">
              <div className="flex flex-col gap-2">
                <div className="bg-primary text-white font-mono text-[18px] px-4 py-3 rounded-lg shadow-sm font-bold text-center">
                  {mainDiagnosis.icd11_code}
                </div>
                <input
                  type="text"
                  value={mainDiagnosis.icd11_code}
                  onChange={(e) => handleMainDiagnosisChange("icd11_code", e.target.value)}
                  className="w-20 border border-outline-variant bg-white p-1 rounded text-center text-xs font-mono focus:outline-none"
                  placeholder="Code"
                />
              </div>
              <div className="flex-1 space-y-3">
                <label className="font-label-caps text-label-caps text-primary block">
                  Main Diagnosis Description
                </label>
                <textarea
                  className="w-full border border-outline-variant rounded text-sm bg-white focus:ring-primary p-2 focus:outline-none"
                  rows={2}
                  value={mainDiagnosis.diagnosis_text}
                  onChange={(e) => handleMainDiagnosisChange("diagnosis_text", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* OTHER DIAGNOSES */}
          <div className="space-y-3">
            {otherDiagnoses.map((diag, index) => (
              <div
                key={index}
                className={`relative flex items-center gap-4 p-4 rounded-xl border transition-all ${
                  diag.source === "user"
                    ? "bg-tertiary-fixed-dim/10 border-tertiary/20"
                    : "bg-surface-container border-outline-variant"
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-sm font-bold bg-white text-on-surface px-3 py-2 border border-outline-variant rounded text-center min-w-16">
                    {diag.icd11_code}
                  </span>
                  <input
                    type="text"
                    value={diag.icd11_code}
                    onChange={(e) => handleOtherDiagnosisChange(index, "icd11_code", e.target.value)}
                    className="w-16 border border-outline-variant bg-white p-0.5 rounded text-center text-[10px] font-mono focus:outline-none"
                    placeholder="Code"
                  />
                </div>
                <input
                  className="flex-1 text-sm font-medium text-on-surface-variant bg-transparent border-none focus:ring-0 focus:outline-none"
                  type="text"
                  value={diag.diagnosis_text}
                  onChange={(e) => handleOtherDiagnosisChange(index, "diagnosis_text", e.target.value)}
                />
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${
                      diag.source === "user"
                        ? "bg-tertiary text-white"
                        : diag.source === "static"
                        ? "bg-primary-fixed/30 text-on-primary-fixed-variant"
                        : "bg-primary-container text-on-primary-container"
                    }`}
                  >
                    {diag.source === "user" ? "User Modified" : "AI Predicted"}
                  </span>
                  <button
                    onClick={() => handleRemoveSecondaryDiagnosis(index)}
                    className="text-red-500 hover:text-red-700 cursor-pointer"
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
                <p key={index} className="text-[12px] text-on-surface-variant mt-1">
                  {alertText}
                </p>
              ))}
            </div>
          </section>
        )}
        <div className="h-24"></div> {/* Spacer for sticky footer */}
      </div>

      {/* E. FOOTER (Sticky) */}
      <div className="mt-auto bg-white border-t border-outline-variant px-6 py-4 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <button
            onClick={onReject}
            className="px-4 py-2 border border-error text-error font-title-sm text-title-sm rounded hover:bg-error/5 transition-colors cursor-pointer"
          >
            Reject / Re-run
          </button>
          <button
            onClick={onEscalate}
            className="px-4 py-2 border border-outline text-on-surface-variant font-title-sm text-title-sm rounded hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Escalate Node
          </button>
        </div>
        <button
          onClick={handleApproveClick}
          className="bg-primary-container text-on-primary-container px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:opacity-90 transition-transform active:scale-95 shadow-md cursor-pointer"
        >
          <span className="material-symbols-outlined">send</span>
          Approve &amp; Submit to SMRP Portal
        </button>
      </div>
    </section>
  );
}
