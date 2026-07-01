"use client";

import React, { useState, useEffect } from "react";

interface PDFViewerProps {
  file: File | null;
  onFileSelect: (file: File) => void;
  isLoading: boolean;
  extractedText?: string;
}

export default function PDFViewer({
  file,
  onFileSelect,
  isLoading,
  extractedText,
}: PDFViewerProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"pdf" | "text">("pdf");
  const [isDragActive, setIsDragActive] = useState(false);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
      setViewMode("pdf");
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPdfUrl(null);
    }
  }, [file]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        onFileSelect(droppedFile);
      } else {
        alert("Only PDF files are supported.");
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-[45%] bg-white border-r border-outline-variant flex flex-col h-full">
      <header className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-outline">description</span>
          <span className="font-title-sm text-title-sm truncate max-w-[200px]">
            {file ? file.name : "No document loaded"}
          </span>
        </div>
        {file && (
          <div className="flex items-center gap-2 bg-primary-container/20 text-primary px-2.5 py-1 rounded-full text-[11px] font-bold">
            <span className="material-symbols-outlined text-[14px]">check_circle</span>
            Docling Layout-Aware
          </div>
        )}
      </header>

      {/* Tabs to switch views */}
      {file && (
        <div className="flex border-b border-outline-variant bg-surface-container-low px-4">
          <button
            onClick={() => setViewMode("pdf")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              viewMode === "pdf"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant/70 hover:text-on-surface-variant"
            }`}
          >
            Original PDF
          </button>
          <button
            onClick={() => setViewMode("text")}
            className={`px-4 py-2 text-xs font-bold border-b-2 transition-all ${
              viewMode === "text"
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant/70 hover:text-on-surface-variant"
            }`}
          >
            Extracted Layout Text
          </button>
        </div>
      )}

      <div className="flex-1 relative bg-slate-50/50 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex flex-col items-center justify-center z-10">
            <div className="w-12 h-12 rounded-full border-4 border-outline-variant border-t-primary animate-spin mb-4" />
            <p className="font-title-sm text-title-sm text-primary font-bold">Processing Document...</p>
            <p className="text-xs text-on-surface-variant/70 mt-1">Running IBM Docling & de-identification...</p>
          </div>
        )}

        {pdfUrl ? (
          viewMode === "pdf" ? (
            <iframe src={pdfUrl} className="w-full h-full border-none" />
          ) : (
            <div className="h-full overflow-y-auto p-6 scrollbar-hide">
              <div className="bg-white p-8 shadow-xs border border-outline-variant rounded-lg min-h-full font-sans text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                {extractedText || "No text extracted yet."}
              </div>
            </div>
          )
        ) : (
          <div
            className={`h-full flex flex-col items-center justify-center p-8 text-center border-2 border-dashed transition-all ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-outline-variant bg-white"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <span className="material-symbols-outlined text-[48px] text-outline mb-4">
              upload_file
            </span>
            <h3 className="font-title-sm text-title-sm text-on-surface mb-2">
              Upload Clinical Document
            </h3>
            <p className="text-xs text-on-surface-variant/70 max-w-[280px] mb-6">
              Drag and drop your medical report PDF here, or browse local files.
            </p>
            <label className="bg-primary text-on-primary hover:opacity-90 active:scale-95 transition-all px-4 py-2.5 rounded font-title-sm text-title-sm cursor-pointer shadow-xs">
              Browse Files
              <input
                type="file"
                className="hidden"
                accept="application/pdf"
                onChange={handleFileInput}
              />
            </label>
          </div>
        )}
      </div>
    </div>
  );
}
