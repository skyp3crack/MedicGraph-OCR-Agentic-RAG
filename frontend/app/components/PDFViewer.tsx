"use client";

import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabList, Tab, Spinner, Button } from "@heroui/react";

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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="w-full md:w-[45%] bg-white border-r border-outline-variant flex flex-col h-[500px] md:h-full flex-shrink-0">
      <header className="flex items-center justify-between px-6 py-4 border-b border-outline-variant bg-surface-container-lowest flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-outline">description</span>
          <span className="font-title-sm text-title-sm truncate max-w-[180px] md:max-w-[200px]">
            {file ? file.name : "No document loaded"}
          </span>
        </div>
        {file && (
          <div className="flex items-center gap-1.5 bg-primary-container/20 text-primary px-2.5 py-1 rounded-full text-[10px] font-bold">
            <span className="material-symbols-outlined text-[13px]">check_circle</span>
            Docling Layout-Aware
          </div>
        )}
      </header>

      {/* Tabs to switch views */}
      {file && (
        <div className="flex border-b border-outline-variant bg-surface-container-low px-4 flex-shrink-0">
          <Tabs 
            selectedKey={viewMode} 
            onSelectionChange={(key) => setViewMode(key as "pdf" | "text")}
            className="w-full"
          >
            <TabList className="flex gap-6 w-full h-10 items-center">
              <Tab id="pdf" className="px-1 py-2 text-xs font-bold transition-all border-b-2 data-[selected=true]:border-primary data-[selected=true]:text-primary border-transparent text-on-surface-variant/70 cursor-pointer">
                Original PDF
              </Tab>
              <Tab id="text" className="px-1 py-2 text-xs font-bold transition-all border-b-2 data-[selected=true]:border-primary data-[selected=true]:text-primary border-transparent text-on-surface-variant/70 cursor-pointer">
                Extracted Layout Text
              </Tab>
            </TabList>
          </Tabs>
        </div>
      )}

      <div className="flex-1 relative bg-slate-50/50 overflow-hidden">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex flex-col items-center justify-center z-10">
            <Spinner size="lg" color="accent" />
            <p className="text-primary font-bold text-sm mt-3">Processing Document...</p>
            <p className="text-[11px] text-on-surface-variant/70 mt-1">Running IBM Docling & de-identification...</p>
          </div>
        )}

        {pdfUrl ? (
          viewMode === "pdf" ? (
            <iframe src={pdfUrl} className="w-full h-full border-none" />
          ) : (
            <div className="h-full overflow-y-auto p-4 md:p-6 scrollbar-hide">
              <div className="bg-white p-6 md:p-8 shadow-sm border border-outline-variant rounded-lg min-h-full font-sans text-sm text-on-surface leading-relaxed whitespace-pre-wrap">
                {extractedText || "No text extracted yet."}
              </div>
            </div>
          )
        ) : (
          <div
            className={`h-full flex flex-col items-center justify-center p-6 md:p-8 text-center border-2 border-dashed transition-all ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-outline-variant bg-white"
            }`}
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
          >
            <span className="material-symbols-outlined text-[40px] md:text-[48px] text-outline mb-3">
              upload_file
            </span>
            <h3 className="font-title-sm text-title-sm text-on-surface mb-1 md:mb-2">
              Upload Clinical Document
            </h3>
            <p className="text-[11px] md:text-xs text-on-surface-variant/70 max-w-[280px] mb-4 md:mb-6">
              Drag and drop your medical report PDF here, or browse local files.
            </p>
            <Button
              variant="primary"
              onPress={() => fileInputRef.current?.click()}
              className="font-bold text-xs md:text-sm shadow-sm px-6 h-10"
            >
              Browse Files
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept="application/pdf"
              onChange={handleFileInput}
            />
          </div>
        )}
      </div>
    </div>
  );
}
