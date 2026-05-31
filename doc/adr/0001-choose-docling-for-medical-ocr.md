# 1. Choose IBM Docling for Layout-Aware Medical OCR

## Status
Accepted

## Context
Our MedicoAgenticAI platform must ingest unstructured, multi-page, scanned clinical documents (like care assessments and KKM-standard medical reports) and parse them into structured formats suitable for downstream LLM validation agents. 

Medical notes present severe formatting challenges: multi-column doctor narratives, embedded tables with non-standard reference ranges, and low-resolution physical scans. If we use basic text extractors, we risk losing structural context (misaligning tables and text columns), which directly drops our downstream extraction accuracy.

We evaluated three serious alternatives:
1. **Tesseract 5.5 (Classical OCR Engine):** 
   * *Pros:* Exceptionally fast on CPU, small footprint (~100MB memory).
   * *Cons:* Prone to catastrophic layout failures on multi-column text or complex tables.
2. **LlamaParse (Cloud Vision-Language API):**
   * *Pros:* Highly accurate cross-layout mapping.
   * *Cons:* Requires a proprietary cloud-API, introduces severe multi-page network latencies, and violates our privacy-first design constraints for handling Protected Health Information (PHI).
3. **IBM Docling:**
   * *Pros:* Uses advanced object detection models (DocLayNet) for strict layout preservation and specialized neural networks (TableFormer) for complex cell coordinate extraction. Open-source, highly modular, and can be completely hosted locally.
   * *Cons:* Heavy dependency management overhead and an AGPL license requirement.

## Decision
We choose **IBM Docling** as our primary document parsing and layout-aware OCR engine. We will build a modular pipeline that extracts text natively through Docling. For documents with poor confidence flags, we will establish a local fallback route to a Vision-Language Model (VLM) running in our local sandbox.

## Consequences
* **Positive:** We achieve high-fidelity data extraction from unstructured clinical forms, cleanly separating tabular structures without contextual leakage.
* **Positive:** The solution runs entirely inside our containerized environment, guaranteeing data compliance since patient records never exit to a cloud API.
* **Negative:** Increased initial processing overhead on hardware compared to Tesseract.
* **Subsequent Action:** We must set up systematic unit testing to evaluate text extraction quality using Word Error Rate ($WER$) and Character Error Rate ($CER$) metrics against clinical ground truth.