import pytest
from pathlib import Path
from fastapi import HTTPException
from backend.app.services.parser import DocumentParser
from backend.app.services.extractor import extraction_engine
from backend.app.services.verifier import evidence_verifier
from backend.app.services.docx_generator import docx_generator
from backend.app.services.xlsx_generator import xlsx_generator
from backend.app.utils.security import validate_uploaded_file
from backend.app.models.schemas import ParameterKey, VerificationStatus

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"

def test_scenario_01_normal_pdf():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_1_normal_tender.pdf")
    params = extraction_engine.extract_parameters(doc)
    verified, _ = evidence_verifier.verify_all(doc, params)
    assert verified["tender_no"].status == VerificationStatus.VERIFIED
    assert len(verified) == 12

def test_scenario_02_scanned_pdf():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_2_scanned_tender.pdf")
    assert doc.pages[0].is_scanned is True
    params = extraction_engine.extract_parameters(doc)
    assert len(params) == 12

def test_scenario_03_mixed_pdf():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_3_mixed_scanned.pdf")
    assert len(doc.pages) == 3
    assert not doc.pages[0].is_scanned
    assert doc.pages[1].is_scanned
    assert not doc.pages[2].is_scanned

def test_scenario_04_word_document():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_4_word_tender.docx")
    assert doc.file_type == "docx"
    params = extraction_engine.extract_parameters(doc)
    assert "TSNPDCL" in params["tender_no"].extracted_value or "TSNPDCL" in params["authority"].extracted_value

def test_scenario_05_missing_parameters():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_5_missing_parameters.pdf")
    params = extraction_engine.extract_parameters(doc)
    # Check that missing fields strictly display an em dash '—'
    assert params["emd"].extracted_value == "—"
    assert params["indicative_value"].extracted_value == "—"
    assert params["consortium"].extracted_value == "—"
    assert params["om"].extracted_value == "—"

def test_scenario_06_conflicting_implementation():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_6_conflicting_implementation.pdf")
    params = extraction_engine.extract_parameters(doc)
    verified, conflicts = evidence_verifier.verify_all(doc, params)
    impl_conf = [c for c in conflicts if c.parameter_key == ParameterKey.IMPLEMENTATION]
    assert len(impl_conf) == 1
    assert verified["implementation"].status == VerificationStatus.CONFLICT
    assert verified["implementation"].review_required is True

def test_scenario_07_conflicting_bid_dates():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_7_conflicting_bid_dates.pdf")
    params = extraction_engine.extract_parameters(doc)
    verified, conflicts = evidence_verifier.verify_all(doc, params)
    date_conf = [c for c in conflicts if c.parameter_key == ParameterKey.BID_DATES]
    assert len(date_conf) == 1
    assert verified["bid_dates"].status == VerificationStatus.CONFLICT

def test_scenario_08_multiple_financial_amounts():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_8_multiple_financial_amounts.pdf")
    params = extraction_engine.extract_parameters(doc)
    # Must NOT confuse bidder turnover (50 Cr) with indicative value
    assert "50 Crores" not in params["indicative_value"].extracted_value
    assert params["indicative_value"].extracted_value == "—"

def test_scenario_09_tables_and_annexures():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_9_tables_and_annexures.pdf")
    params = extraction_engine.extract_parameters(doc)
    assert "Within 4 weeks" in params["implementation"].extracted_value
    assert "AP-IT-2026-TABLE" in params["tender_no"].extracted_value

def test_scenario_10_amendment_supersession():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_10_amendment_supersession.pdf")
    params = extraction_engine.extract_parameters(doc)
    _, conflicts = evidence_verifier.verify_all(doc, params)
    assert any(c.supersession_detected for c in conflicts)

def test_scenario_11_poor_quality_scan():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_11_poor_quality_scan.pdf")
    # Low text scan triggers warning or review
    p_meta = doc.get_pages_meta()[0]
    assert p_meta.is_scanned is True

def test_scenario_12_corrupt_upload():
    # Attempting to parse corrupt pdf must raise error and be caught safely
    corrupt_path = FIXTURES / "scenario_12_corrupt_file.pdf"
    with pytest.raises(Exception):
        DocumentParser.parse_document(corrupt_path)

def test_scenario_13_long_tender():
    doc = DocumentParser.parse_document(FIXTURES / "scenario_13_long_tender.pdf")
    assert doc.page_count >= 24
    params = extraction_engine.extract_parameters(doc)
    # Verify retrieval from deep pages (page 18, 20, 24)
    assert "24 months" in params["implementation"].extracted_value
    assert "5 years" in params["om"].extracted_value
    assert "15-Dec-2026" in params["bid_dates"].extracted_value

def test_scenario_14_word_report_formatting(tmp_path):
    doc = DocumentParser.parse_document(FIXTURES / "scenario_1_normal_tender.pdf")
    params = extraction_engine.extract_parameters(doc)
    report_file = tmp_path / "long_report.docx"
    docx_generator.generate_report("TND-SC14", "scenario_1.pdf", params, report_file)
    assert report_file.exists()

def test_scenario_15_retry_and_idempotency(tmp_path):
    # Repeated processing of same file yields identical idempotent results
    doc1 = DocumentParser.parse_document(FIXTURES / "scenario_1_normal_tender.pdf")
    params1 = extraction_engine.extract_parameters(doc1)
    doc2 = DocumentParser.parse_document(FIXTURES / "scenario_1_normal_tender.pdf")
    params2 = extraction_engine.extract_parameters(doc2)
    assert params1["tender_no"].extracted_value == params2["tender_no"].extracted_value
    assert params1["authority"].extracted_value == params2["authority"].extracted_value
