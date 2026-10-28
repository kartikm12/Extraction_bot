import pytest
from pathlib import Path
from backend.app.services.parser import DocumentParser

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"

def test_parse_normal_pdf():
    pdf_path = FIXTURES / "scenario_1_normal_tender.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    assert doc.page_count == 2
    assert "TSTS/HW/2026/089" in doc.full_text
    assert "Telangana State Technology Services" in doc.full_text
    pages_meta = doc.get_pages_meta()
    assert len(pages_meta) == 2
    assert not pages_meta[0].is_scanned

def test_parse_word_docx():
    docx_path = FIXTURES / "scenario_4_word_tender.docx"
    doc = DocumentParser.parse_document(docx_path)
    assert doc.page_count >= 1
    assert "TSNPDCL" in doc.full_text
    assert "Power Transformers" in doc.full_text

def test_detect_scanned_pdf():
    pdf_path = FIXTURES / "scenario_2_scanned_tender.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    assert doc.page_count == 1
    meta = doc.get_pages_meta()[0]
    assert meta.is_scanned

def test_parse_mixed_pdf():
    pdf_path = FIXTURES / "scenario_3_mixed_scanned.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    assert doc.page_count == 3
    metas = doc.get_pages_meta()
    assert not metas[0].is_scanned
    assert metas[1].is_scanned
    assert not metas[2].is_scanned

