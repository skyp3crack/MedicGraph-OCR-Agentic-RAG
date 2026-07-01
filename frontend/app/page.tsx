"use client";

import React, { useState } from "react";
import PDFViewer from "./components/PDFViewer";
import HITLDashboard, { HITLData, ICD11Entry } from "./components/HITLDashboard";
import { uploadPdf, queryDocument } from "./utils/api";

const mockInitialData: HITLData = {
  demographics: {
    name: "AHMAD BIN ZULKIFLI",
    icNumber: "840921-14-5583",
    gender: "Male",
    age: "40",
    admissionDate: "2024-09-12 08:45 AM",
  },
  mainDiagnosis: {
    icd11_code: "5A11",
    diagnosis_text: "Hypertension-related secondary nephropathy with mild progressive decline in renal filtration capacity.",
    source: "ai",
    confidence: 0.984,
  },
  otherDiagnoses: [
    {
      icd11_code: "BA41.1",
      diagnosis_text: "Acute Myocardial Infarction, Subsequent",
      source: "static",
    },
    {
      icd11_code: "ED90.1",
      diagnosis_text: "Secondary Hyperlipidemia, Type IV",
      source: "user",
    },
  ],
  validationAlerts: [
    "Diagnosis '5A11' requires matching ICD-11 Kidney Function records for automated approval. Score: 0.72. Manual audit requested.",
  ],
};

interface ChatMessage {
  sender: "user" | "arif";
  text: string;
}

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [extractedText, setExtractedText] = useState<string>("");
  
  // Interactive Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { sender: "arif", text: "System ready for ICD-11 PD301 validation protocols." },
  ]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [isQuerying, setIsQuerying] = useState(false);

  // Ingestion Handler
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsIngesting(true);
    
    // Reset states
    setDocumentId(null);
    setExtractedText("");
    setChatMessages([
      { sender: "arif", text: `Uploading and ingesting ${file.name}...` },
    ]);

    try {
      const response = await uploadPdf(file);
      setDocumentId(response.document_id);
      
      // Simulate/approximate layout text from standard read or just display message
      setExtractedText(
        `--- Extracted Document: ${file.name} ---\n` +
        `UUID: ${response.document_id}\n` +
        `Ingested into ${response.num_chunks} text chunks.\n\n` +
        `Please use the ARIF Assistant panel in the sidebar to run retrieval-augmented queries against the document content.`
      );

      setChatMessages((prev) => [
        ...prev,
        {
          sender: "arif",
          text: `Successfully ingested document! ID: ${response.document_id}. Ask me any clinical questions regarding this report.`,
        },
      ]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "arif",
          text: `Ingestion failed: ${err.message || "Unknown error"}. Check if your backend is running on port 8000.`,
        },
      ]);
      alert(`Upload error: ${err.message || "Failed to connect to backend server."}`);
    } finally {
      setIsIngesting(false);
    }
  };

  // Chat Query Handler
  const handleSendQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentQuestion.trim()) return;

    const question = currentQuestion;
    setCurrentQuestion("");
    
    // Add user message to log
    setChatMessages((prev) => [...prev, { sender: "user", text: question }]);

    if (!documentId) {
      setChatMessages((prev) => [
        ...prev,
        { sender: "arif", text: "Please upload and ingest a clinical PDF report first before querying." },
      ]);
      return;
    }

    setIsQuerying(true);
    try {
      const response = await queryDocument(documentId, question);
      setChatMessages((prev) => [
        ...prev,
        { sender: "arif", text: response.answer },
      ]);
    } catch (err: any) {
      console.error(err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "arif",
          text: `Query error: ${err.message || "Could not retrieve clinical context."}`,
        },
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  // Dashboard buttons action
  const handleApprove = (finalData: HITLData) => {
    console.log("Submitting verified clinical data to database:", finalData);
    alert(`Data Approved & Saved!\n\nPatient: ${finalData.demographics.name}\nMain Code: ${finalData.mainDiagnosis.icd11_code}`);
  };

  const handleReject = () => {
    console.log("Clinician rejected the record.");
    alert("Record rejected and flagged for audit.");
  };

  const handleEscalate = () => {
    console.log("Escalated to senior audit node.");
    alert("Record escalated to Senior Medical Board panel.");
  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-row font-sans">
      {/* PRIMARY LEFT SIDEBAR */}
      <aside className="w-[260px] flex-shrink-0 bg-inverse-surface flex flex-col z-50 shadow-sm border-r border-outline-variant/10 text-on-primary">
        <div className="px-6 py-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center">
            <span className="material-symbols-outlined text-primary font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
              clinical_notes
            </span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-bold text-primary-fixed text-headline-md leading-none">MedicoAgenticAI</h1>
            <span className="text-[9px] text-surface-variant/70 uppercase tracking-widest font-bold mt-1">
              MedicGraph Intelligence
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-4 space-y-1 scrollbar-hide py-2">
          <div className="text-[10px] text-surface-variant font-bold uppercase tracking-widest px-2 mb-2">
            Agentic Pipelines
          </div>
          <a
            className="text-primary-fixed-dim font-bold border-l-4 border-primary-fixed pl-4 flex items-center gap-3 py-3 hover:bg-surface-variant/10 transition-colors duration-200"
            href="#"
          >
            <span className="material-symbols-outlined text-sm">map_pin_review</span>
            <span className="text-body-md">Pipeline Overview</span>
          </a>
          <a
            className="text-surface-variant flex items-center gap-3 px-6 py-3 hover:bg-surface-variant/10 hover:text-primary-fixed-dim transition-colors duration-200"
            href="#"
          >
            <span className="material-symbols-outlined text-sm">batch_prediction</span>
            <span className="text-body-md">Active Batches</span>
          </a>
          <a
            className="text-surface-variant flex items-center gap-3 px-6 py-3 hover:bg-surface-variant/10 hover:text-primary-fixed-dim transition-colors duration-200"
            href="#"
          >
            <span className="material-symbols-outlined text-sm">rule_settings</span>
            <span className="text-body-md">Validation Tasks</span>
            <span className="ml-auto bg-primary-container text-on-primary-container px-1.5 py-0.5 rounded text-[10px] font-bold">
              12
            </span>
          </a>
          <a
            className="text-surface-variant flex items-center gap-3 px-6 py-3 hover:bg-surface-variant/10 hover:text-primary-fixed-dim transition-colors duration-200"
            href="#"
          >
            <span className="material-symbols-outlined text-sm">analytics</span>
            <span className="text-body-md">System Health</span>
          </a>
          <a
            className="text-surface-variant flex items-center gap-3 px-6 py-3 hover:bg-surface-variant/10 hover:text-primary-fixed-dim transition-colors duration-200"
            href="#"
          >
            <span className="material-symbols-outlined text-sm">settings</span>
            <span className="text-body-md">Settings</span>
          </a>
        </nav>

        {/* Interactive ARIF Assistant Widget */}
        <div className="p-4 bg-surface-variant/5 border-t border-surface-variant/10 flex flex-col gap-2 max-h-[300px]">
          <div className="bg-primary/25 rounded-xl p-3 border border-primary-fixed/20 flex flex-col h-full overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary-fixed-dim text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                smart_toy
              </span>
              <span className="text-primary-fixed-dim font-bold text-[12px]">ARIF Assistant</span>
              {isQuerying && <span className="w-1.5 h-1.5 rounded-full bg-primary-fixed animate-ping ml-auto" />}
            </div>
            
            {/* Messages Stream */}
            <div className="flex-1 overflow-y-auto space-y-2 mb-2 pr-1 scrollbar-hide text-[11px] max-h-[140px] min-h-[80px]">
              {chatMessages.map((msg, index) => (
                <div
                  key={index}
                  className={`p-2 rounded-lg leading-relaxed ${
                    msg.sender === "arif"
                      ? "bg-surface-container-low text-on-surface-variant border-l-2 border-primary"
                      : "bg-primary text-on-primary ml-4 self-end text-right"
                  }`}
                >
                  {msg.text}
                </div>
              ))}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendQuestion} className="flex gap-1 mt-auto">
              <input
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                placeholder="Ask ARIF..."
                className="flex-1 bg-white/10 text-white rounded border border-white/20 p-1.5 text-[11px] placeholder-white/50 focus:outline-none focus:border-primary-fixed"
                disabled={isIngesting || isQuerying}
              />
              <button
                type="submit"
                className="bg-primary-fixed text-on-primary-fixed rounded p-1 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
                disabled={isIngesting || isQuerying || !currentQuestion.trim()}
              >
                <span className="material-symbols-outlined text-[14px]">send</span>
              </button>
            </form>
          </div>
        </div>

        <footer className="p-4 flex flex-col gap-1.5 border-t border-surface-variant/5 bg-slate-900/50">
          <a className="text-surface-variant flex items-center gap-2 px-2 py-1.5 hover:underline text-[12px]" href="#">
            <span className="material-symbols-outlined text-[16px]">help</span>
            <span>Documentation</span>
          </a>
          <div className="text-on-surface-variant/40 text-[9px] px-2 font-bold tracking-widest uppercase">
            v4.2 Clinical Protocol
          </div>
        </footer>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-row overflow-hidden h-screen bg-background">
        {/* LEFT PANEL: PDF VIEWER & EXTRACTED TEXT (45%) */}
        <PDFViewer
          file={selectedFile}
          onFileSelect={handleFileSelect}
          isLoading={isIngesting}
          extractedText={extractedText}
        />

        {/* RIGHT PANEL: STRUCTURED HITL WORKBENCH (55%) */}
        <HITLDashboard
          data={mockInitialData}
          onApprove={handleApprove}
          onReject={handleReject}
          onEscalate={handleEscalate}
        />
      </main>
    </div>
  );
}
