"""
OCR Service — PDF text extraction with optional Tesseract OCR fallback.

Provides a clean, importable function for extracting text from PDF files.
Supports both selectable-text PDFs (via pypdf) and scanned PDFs (via pytesseract).
"""

import logging
import os
import sys
from typing import Dict, Any, Tuple, Union

from pypdf import PdfReader
import pytesseract
from pdf2image import convert_from_path

logger = logging.getLogger(__name__)

# --- Windows Path Auto-configuration ---
if sys.platform.startswith("win"):
    # If tesseract isn't in PATH, check the default installation folder
    default_win_path = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    if os.path.exists(default_win_path):
        pytesseract.pytesseract.tesseract_cmd = default_win_path
        logger.info(f"Configured Windows Tesseract command path: {default_win_path}")


class PDFExtractionError(Exception):
    """Raised when PDF text extraction fails entirely."""
    pass


class EmptyPDFError(Exception):
    """Raised when the extracted text is empty or whitespace-only."""
    pass


def extract_text_from_pdf(
    pdf_path: str, 
    return_metrics: bool = False
) -> Union[str, Tuple[str, Dict[str, Any]]]:
    """
    Extract text content from a PDF file.

    Uses pypdf for selectable text extraction. For scanned pages where
    pypdf returns no text, falls back to pdf2image + pytesseract OCR.

    Args:
        pdf_path: Absolute or relative path to the PDF file.
        return_metrics: If True, returns a tuple containing the extracted text 
                        and a dictionary of extraction quality metrics.

    Returns:
        If return_metrics is False: Extracted text content as a single string.
        If return_metrics is True: Tuple of (extracted_text, metrics_dict).

    Raises:
        PDFExtractionError: If the PDF cannot be read or processed.
        EmptyPDFError: If no text could be extracted from any page.
        FileNotFoundError: If the PDF file does not exist.
    """
    if not os.path.exists(pdf_path):
        logger.error(f"PDF file not found: {pdf_path}")
        raise FileNotFoundError(f"No such file: {pdf_path}")

    text = ""
    selectable_pages = 0
    scanned_pages = 0
    confidences = []

    try:
        pdf_reader = PdfReader(pdf_path)
        total_pages = len(pdf_reader.pages)
        logger.info(f"Processing PDF: {pdf_path} ({total_pages} pages)")

        for page_num, page in enumerate(pdf_reader.pages, start=1):
            page_text = page.extract_text()
            if page_text and page_text.strip():
                text += page_text + "\n"
                selectable_pages += 1
                logger.debug(f"Page {page_num}/{total_pages}: extracted {len(page_text)} characters (selectable)")
            else:
                logger.warning(f"Page {page_num}/{total_pages}: no selectable text found. Running OCR fallback...")
                try:
                    # Convert only this specific page to an image to save memory
                    images = convert_from_path(
                        pdf_path,
                        first_page=page_num,
                        last_page=page_num
                    )
                    if images:
                        image = images[0]
                        # Extract text
                        ocr_text = pytesseract.image_to_string(image)
                        text += ocr_text + "\n"
                        scanned_pages += 1

                        # Calculate OCR confidence scores
                        data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
                        page_confs = [int(c) for c in data.get("conf", []) if int(c) != -1]
                        if page_confs:
                            confidences.extend(page_confs)
                        
                        logger.debug(f"Page {page_num}/{total_pages}: extracted {len(ocr_text)} characters via OCR")
                except Exception as ocr_err:
                    logger.error(f"OCR failed for page {page_num}: {ocr_err}")
                    text += f"[SCANNED_PAGE_{page_num}_OCR_FAILED]\n"
                    scanned_pages += 1

    except Exception as e:
        logger.error(f"Failed to process PDF: {e}")
        raise PDFExtractionError(f"Error during PDF processing: {e}") from e

    cleaned_text = text.strip()
    if not cleaned_text:
        raise EmptyPDFError(f"No text could be extracted from: {pdf_path}")

    # Calculate average confidence
    avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0
    logger.info(f"Extraction complete: {len(cleaned_text)} characters. (Selectable: {selectable_pages}, Scanned: {scanned_pages})")

    metrics = {
        "char_count": len(cleaned_text),
        "total_pages": total_pages,
        "selectable_pages": selectable_pages,
        "scanned_pages": scanned_pages,
        "avg_ocr_confidence": round(avg_confidence, 2)
    }

    if return_metrics:
        return cleaned_text, metrics
    return cleaned_text
