"""
Unit tests for the OCR Service and quality metrics.
"""

from unittest.mock import patch, MagicMock
import pytest
from app.Services.ocr_service import extract_text_from_pdf, PDFExtractionError, EmptyPDFError


@patch("app.Services.ocr_service.PdfReader")
def test_extract_text_selectable_only(mock_pdf_reader):
    """Verify standard selectable text extraction returns correct text and metrics."""
    # Mock standard PDF pages
    mock_page1 = MagicMock()
    mock_page1.extract_text.return_value = "Hello Selectable World"
    
    mock_reader_instance = MagicMock()
    mock_reader_instance.pages = [mock_page1]
    mock_pdf_reader.return_value = mock_reader_instance

    with patch("os.path.exists", return_value=True):
        text, metrics = extract_text_from_pdf("dummy.pdf", return_metrics=True)

        assert text == "Hello Selectable World"
        assert metrics["total_pages"] == 1

        assert metrics["selectable_pages"] == 1
        assert metrics["scanned_pages"] == 0
        assert metrics["avg_ocr_confidence"] == 0.0


@patch("app.Services.ocr_service.PdfReader")
@patch("app.Services.ocr_service.convert_from_path")
@patch("app.Services.ocr_service.pytesseract")
def test_extract_text_scanned_fallback(mock_tesseract, mock_convert, mock_pdf_reader):
    """Verify scanned PDF fallback triggers OCR and returns proper metrics."""
    # Page 1 has no selectable text
    mock_page1 = MagicMock()
    mock_page1.extract_text.return_value = ""
    
    mock_reader_instance = MagicMock()
    mock_reader_instance.pages = [mock_page1]
    mock_pdf_reader.return_value = mock_reader_instance

    # Mock pdf2image and pytesseract
    mock_convert.return_value = [MagicMock()]
    mock_tesseract.image_to_string.return_value = "OCR Extracted Text"
    mock_tesseract.image_to_data.return_value = {"conf": [80, 90, 70, -1]}
    mock_tesseract.Output.DICT = "dict"

    with patch("os.path.exists", return_value=True):
        text, metrics = extract_text_from_pdf("dummy.pdf", return_metrics=True)

        assert "OCR Extracted Text" in text
        assert metrics["total_pages"] == 1
        assert metrics["selectable_pages"] == 0
        assert metrics["scanned_pages"] == 1
        assert metrics["avg_ocr_confidence"] == 80.0  # Average of 80, 90, 70 (excluding -1)


@patch("app.Services.ocr_service.PdfReader")
def test_empty_pdf_error(mock_pdf_reader):
    """Verify EmptyPDFError is raised when no text can be found."""
    mock_page1 = MagicMock()
    mock_page1.extract_text.return_value = "   "
    
    mock_reader_instance = MagicMock()
    mock_reader_instance.pages = [mock_page1]
    mock_pdf_reader.return_value = mock_reader_instance

    with patch("os.path.exists", return_value=True), \
         patch("app.Services.ocr_service.convert_from_path", return_value=[]):
        
        with pytest.raises(EmptyPDFError):
            extract_text_from_pdf("dummy.pdf")
