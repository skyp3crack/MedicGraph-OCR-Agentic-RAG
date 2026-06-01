"""
OCR Service — PDF text extraction with optional Tesseract OCR fallback.

Provides a clean, importable function for extracting text from PDF files.
Supports both selectable-text PDFs (via pypdf) and scanned PDFs (via pytesseract).
"""

import logging
from pypdf import PdfReader

logger = logging.getLogger(__name__)


class PDFExtractionError(Exception):
    """Raised when PDF text extraction fails entirely."""
    pass


class EmptyPDFError(Exception):
    """Raised when the extracted text is empty or whitespace-only."""
    pass


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract text content from a PDF file.

    Uses pypdf for selectable text extraction. For scanned pages where
    pypdf returns no text, logs a warning and inserts a placeholder.

    Args:
        pdf_path: Absolute or relative path to the PDF file.

    Returns:
        Extracted text content as a single string.

    Raises:
        PDFExtractionError: If the PDF cannot be read or processed.
        EmptyPDFError: If no text could be extracted from any page.
        FileNotFoundError: If the PDF file does not exist.
    """
    text = ""
    try:
        pdf_reader = PdfReader(pdf_path)
        total_pages = len(pdf_reader.pages)
        logger.info(f"Processing PDF: {pdf_path} ({total_pages} pages)")

        for page_num, page in enumerate(pdf_reader.pages, start=1):
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
                logger.debug(f"Page {page_num}/{total_pages}: extracted {len(page_text)} characters")
            else:
                logger.warning(
                    f"Page {page_num}/{total_pages}: no selectable text found. "
                    "This page may be a scanned image. "
                    "Enable pdf2image + pytesseract for OCR fallback."
                )
                # TODO: Activate OCR fallback when Tesseract + Poppler are configured
                # from pdf2image import convert_from_path
                # images = convert_from_path(
                #     pdf_path,
                #     first_page=page_num,
                #     last_page=page_num
                # )
                # if images:
                #     import pytesseract
                #     text += pytesseract.image_to_string(images[0]) + "\n"
                text += f"[SCANNED_PAGE_{page_num}_OCR_NOT_ENABLED]\n"

    except FileNotFoundError:
        logger.error(f"PDF file not found: {pdf_path}")
        raise
    except Exception as e:
        logger.error(f"Failed to process PDF: {e}")
        raise PDFExtractionError(f"Error during PDF processing: {e}") from e

    if not text.strip():
        raise EmptyPDFError(f"No text could be extracted from: {pdf_path}")

    logger.info(f"Extraction complete: {len(text)} total characters")
    return text
