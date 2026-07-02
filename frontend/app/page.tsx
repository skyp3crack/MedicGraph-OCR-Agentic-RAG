"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PDFViewer from "./components/PDFViewer";
import HITLDashboard, { HITLData } from "./components/HITLDashboard";
import { uploadPdf, queryDocument, extractClinicalData, submitAuditAction, getDocumentStatus, SourceChunk } from "./utils/api";
import { useAuth } from "./contexts/AuthContext";
import { Dropdown, DropdownTrigger, DropdownPopover, DropdownMenu, DropdownItem, TextField, InputGroup, Button, Label } from "@heroui/react";

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
  sourceChunks?: SourceChunk[];
}

export default function Home() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();
  
  // Mobile sidebar toggle state
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

  // Dynamic Clinical Extraction State
  const [clinicalData, setClinicalData] = useState<HITLData | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [graphStatus, setGraphStatus] = useState<string>("idle");

  // Auth guard: redirect to sign-in if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-outline-variant border-t-primary animate-spin" />
          <p className="text-sm text-on-surface-variant font-medium">Loading clinical workspace...</p>
        </div>
      </div>
    );
  }

  // Don't render dashboard if not authenticated
  if (!isAuthenticated) return null;

  // Polling Status Handler
  const pollWorkflowStatus = (docId: string, filename: string) => {
    setGraphStatus("parsing");
    
    const interval = setInterval(async () => {
      try {
        const res = await getDocumentStatus(docId);
        setGraphStatus(res.status);
        
        if (res.status === "review_pending") {
          clearInterval(interval);
          setIsIngesting(false);
          
          // Successful ingestion up to review stage. Retrieve the pre-extracted data.
          setIsExtracting(true);
          try {
            const extraction = await extractClinicalData(docId);
            const formatted: HITLData = {
              demographics: {
                name: extraction.demographics.name,
                icNumber: extraction.demographics.ic_number,
                gender: extraction.demographics.gender,
                age: extraction.demographics.age,
                admissionDate: extraction.demographics.admission_date,
              },
              mainDiagnosis: {
                icd11_code: extraction.main_diagnosis.icd11_code,
                diagnosis_text: extraction.main_diagnosis.diagnosis_text,
                source: extraction.main_diagnosis.source as "ai" | "static" | "user",
                confidence: extraction.main_diagnosis.confidence,
              },
              otherDiagnoses: extraction.other_diagnoses.map((d: any) => ({
                icd11_code: d.icd11_code,
                diagnosis_text: d.diagnosis_text,
                source: d.source as "ai" | "static" | "user",
              })),
              validationAlerts: extraction.validation_alerts,
            };
            setClinicalData(formatted);
            
            setExtractedText(
              `--- Extracted Document: ${filename} ---\n` +
              `UUID: ${docId}\n` +
              `Status: Paused at human_review node.\n\n` +
              `All clinical data extracted and de-identified chunks indexed into ChromaDB.\n` +
              `Please use the ARIF Assistant panel in the sidebar to ask questions.`
            );
            
            setChatMessages((prev) => [
              ...prev,
              {
                sender: "arif",
                text: "Clinical extraction completed! Patient records and ICD-11 mapping have been updated in the right workbench panel.",
              },
            ]);
          } catch (extractErr: any) {
            console.error(extractErr);
            setChatMessages((prev) => [
              ...prev,
              {
                sender: "arif",
                text: `Clinical extraction failed: ${extractErr.message || "Failed to extract structured data"}.`,
              },
            ]);
          } finally {
            setIsExtracting(false);
          }
        } else if (res.status === "failed") {
          clearInterval(interval);
          setIsIngesting(false);
          setChatMessages((prev) => [
            ...prev,
            {
              sender: "arif",
              text: `Ingestion failed: ${res.error_message || "Unknown graph execution error"}.`,
            },
          ]);
        }
      } catch (err: any) {
        console.error("Error polling status:", err);
        clearInterval(interval);
        setIsIngesting(false);
      }
    }, 1500);
  };

  // Ingestion Handler
  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setIsIngesting(true);
    setGraphStatus("parsing");
    
    // Reset states
    setDocumentId(null);
    setExtractedText("");
    setClinicalData(null);
    setChatMessages([
      { sender: "arif", text: `Uploading and ingesting ${file.name}...` },
    ]);

    try {
      const response = await uploadPdf(file);
      setDocumentId(response.document_id);
      
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "arif",
          text: `PDF uploaded successfully! ID: ${response.document_id}. Running LangGraph agentic pipeline...`,
        },
      ]);

      // Start polling the state graph progress
      pollWorkflowStatus(response.document_id, file.name);
    } catch (err: any) {
      console.error(err);
      setIsIngesting(false);
      setGraphStatus("failed");
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "arif",
          text: `Ingestion failed: ${err.message || "Unknown error"}. Check if your backend is running on port 8000.`,
        },
      ]);
      alert(`Upload error: ${err.message || "Failed to connect to backend server."}`);
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
        { sender: "arif", text: response.answer, sourceChunks: response.source_chunks },
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

  const handleApprove = async (finalData: HITLData) => {
    if (!documentId) return;
    try {
      await submitAuditAction(documentId, "approve", finalData);
      alert(`Data Approved & Saved!\n\nPatient: ${finalData.demographics.name}\nMain Code: ${finalData.mainDiagnosis.icd11_code}`);
    } catch (err: any) {
      console.error(err);
      alert(`Approval failed: ${err.message || "Failed to submit verification."}`);
    }
  };

  const handleReject = async () => {
    if (!documentId) return;
    try {
      await submitAuditAction(documentId, "reject");
      alert("Record rejected and flagged for audit.");
    } catch (err: any) {
      console.error(err);
      alert(`Rejection failed: ${err.message || "Failed to submit audit action."}`);
    }
  };

  const handleEscalate = async () => {
    if (!documentId) return;
    try {
      await submitAuditAction(documentId, "escalate");
      alert("Record escalated to Senior Medical Board panel.");
    } catch (err: any) {
      console.error(err);
      alert(`Escalation failed: ${err.message || "Failed to submit escalation request."}`);
    }
  };

  return (
    <div className="h-screen w-full overflow-hidden flex flex-col md:flex-row font-sans">
      {/* MOBILE HEADER BAR - Visible on mobile only */}
      <header className="md:hidden w-full h-14 bg-slate-900 text-white flex items-center justify-between px-4 z-40 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-1.5 hover:bg-white/10 rounded-lg flex items-center justify-center focus:outline-none"
          >
            <span className="material-symbols-outlined text-[24px]">menu</span>
          </button>
          <span className="font-bold text-sm tracking-tight">MedicoAgenticAI</span>
        </div>
        <div className="w-8 h-8 rounded-full bg-primary-fixed/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-primary-fixed-dim text-[18px]">account_circle</span>
        </div>
      </header>

      {/* MOBILE BACKDROP */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-[fadeIn_0.2s_ease-out]" 
        />
      )}

      {/* PRIMARY LEFT SIDEBAR */}
      <aside 
        className={`fixed md:relative inset-y-0 left-0 z-50 w-[260px] flex-shrink-0 bg-inverse-surface flex flex-col shadow-lg md:shadow-sm border-r border-outline-variant/10 text-on-primary transform transition-transform duration-300 md:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-6 py-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center">
              <span className="material-symbols-outlined text-primary font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>
                clinical_notes
              </span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-primary-fixed text-headline-md leading-none">MedicoAgenticAI</h1>
              <span className="text-[9px] text-surface-variant/70 uppercase tracking-widest font-bold mt-1">
                MedicGraph
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden p-1 text-surface-variant hover:text-white rounded-lg flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
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
                      ? "bg-slate-800 text-surface-variant border-l-2 border-primary"
                      : "bg-primary text-on-primary ml-4 self-end text-right"
                  }`}
                >
                  <div>{msg.text}</div>
                  {msg.sourceChunks && msg.sourceChunks.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-white/10 text-[9px] text-white/50 space-y-1 text-left">
                      <div className="font-bold uppercase tracking-wider text-[8px] text-primary-fixed-dim">Source Citations:</div>
                      {msg.sourceChunks.map((chunk, cIdx) => (
                        <div key={cIdx} className="bg-white/5 p-1 rounded hover:bg-white/10 transition-colors">
                          <span className="font-bold text-white/70">
                            [Page {chunk.metadata?.page || chunk.metadata?.page_number || 1}]:
                          </span>{" "}
                          <span className="italic">
                            {chunk.content.length > 60 ? `${chunk.content.substring(0, 60)}...` : chunk.content}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSendQuestion} className="flex gap-1 mt-auto items-end w-full">
              <TextField 
                name="chatQuestion" 
                value={currentQuestion} 
                onChange={setCurrentQuestion}
                isDisabled={isIngesting || isQuerying}
                className="flex-1"
              >
                <InputGroup className="bg-white/10 border-white/20 hover:border-white/40 focus-within:!border-primary-fixed border rounded h-8 min-h-8 px-2 flex items-center">
                  <InputGroup.Input 
                    placeholder="Ask ARIF..."
                    className="w-full h-full text-white text-[11px] placeholder:text-white/40 bg-transparent focus:outline-none"
                  />
                </InputGroup>
              </TextField>
              <Button
                isIconOnly
                size="sm"
                type="submit"
                variant="primary"
                className="bg-primary-fixed text-on-primary-fixed h-8 min-h-8 w-8 min-w-8 rounded flex items-center justify-center"
                isDisabled={isIngesting || isQuerying || !currentQuestion.trim()}
              >
                <span className="material-symbols-outlined text-[14px]">send</span>
              </Button>
            </form>
          </div>
        </div>

        <footer className="p-4 flex flex-col gap-2 border-t border-surface-variant/10 bg-slate-900/50">
          {/* User Profile Dropdown */}
          <div className="relative">
            <Dropdown>
              <DropdownTrigger>
                <div
                  className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-variant/10 transition-colors cursor-pointer group text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-primary-fixed/20 flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-primary-fixed-dim text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      account_circle
                    </span>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-[12px] text-inverse-on-surface font-bold truncate">
                      {user?.name || "User"}
                    </div>
                    <div className="text-[10px] text-surface-variant/60 truncate">
                      {user?.email || ""}
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-surface-variant/50 text-[14px] group-hover:text-surface-variant transition-colors">
                    expand_more
                  </span>
                </div>
              </DropdownTrigger>
              <DropdownPopover className="bg-slate-900 border border-surface-variant/20 text-white rounded-lg shadow-xl min-w-[200px] z-50">
                <DropdownMenu 
                  aria-label="User actions dropdown" 
                  onAction={(key) => {
                    if (key === "logout") logout();
                  }}
                >
                  <DropdownItem 
                    id="settings" 
                    textValue="Account Settings"
                    className="hover:bg-white/10 rounded cursor-pointer p-2"
                  >
                    <div className="flex items-center gap-2 text-white">
                      <span className="material-symbols-outlined text-[16px]">settings</span>
                      <Label className="text-xs cursor-pointer">Account Settings</Label>
                    </div>
                  </DropdownItem>
                  <DropdownItem 
                    id="docs" 
                    textValue="Documentation"
                    className="hover:bg-white/10 rounded cursor-pointer p-2"
                  >
                    <div className="flex items-center gap-2 text-white">
                      <span className="material-symbols-outlined text-[16px]">help</span>
                      <Label className="text-xs cursor-pointer">Documentation</Label>
                    </div>
                  </DropdownItem>
                  <DropdownItem 
                    id="logout" 
                    textValue="Sign Out"
                    className="hover:bg-danger/10 rounded cursor-pointer p-2"
                  >
                    <div className="flex items-center gap-2 text-danger">
                      <span className="material-symbols-outlined text-[16px] text-danger">logout</span>
                      <Label className="text-xs text-danger cursor-pointer">Sign Out</Label>
                    </div>
                  </DropdownItem>
                </DropdownMenu>
              </DropdownPopover>
            </Dropdown>
          </div>

          <div className="text-on-surface-variant/40 text-[9px] px-2 font-bold tracking-widest uppercase">
            v4.2 Clinical Protocol
          </div>
        </footer>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col md:flex-row overflow-y-auto md:overflow-hidden h-full bg-background">
        {/* LEFT PANEL: PDF VIEWER & EXTRACTED TEXT (45% width on desktop, 100% on mobile) */}
        <PDFViewer
          file={selectedFile}
          onFileSelect={handleFileSelect}
          isLoading={isIngesting}
          extractedText={extractedText}
        />

        {/* RIGHT PANEL: STRUCTURED HITL WORKBENCH (55% width on desktop, 100% on mobile) */}
        <HITLDashboard
          data={clinicalData || mockInitialData}
          onApprove={handleApprove}
          onReject={handleReject}
          onEscalate={handleEscalate}
          isLoading={isExtracting}
          graphStatus={graphStatus}
          isIngesting={isIngesting}
        />
      </main>
    </div>
  );
}
