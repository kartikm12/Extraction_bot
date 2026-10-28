import pytest
from pathlib import Path
from backend.app.services.parser import DocumentParser
from backend.app.services.extractor import extraction_engine
from backend.app.models.schemas import ORDERED_PARAMETER_KEYS, ParameterKey, VerificationStatus

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"

def test_extract_12_parameters_schema():
    pdf_path = FIXTURES / "scenario_1_normal_tender.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    extractions = extraction_engine.extract_parameters(doc)
    
    # Must contain exactly the 12 predefined parameters
    assert len(extractions) == 12
    for k in ORDERED_PARAMETER_KEYS:
        assert k.value in extractions
        
    # Check specific fields
    assert "TSTS/HW/2026/089" in extractions["tender_no"].extracted_value
    assert "Telangana" in extractions["authority"].extracted_value
    assert "4 weeks" in extractions["implementation"].extracted_value
    assert "prohibited" in extractions["consortium"].extracted_value.lower()
    
    # Confirm Key Officials is not in extraction keys
    assert "key_officials" not in extractions
    assert "officials" not in extractions

def test_missing_parameters_become_em_dash():
    pdf_path = FIXTURES / "scenario_5_missing_parameters.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    extractions = extraction_engine.extract_parameters(doc)
    
    # EMD was omitted in scenario 5
    assert extractions["emd"].extracted_value == "—"
    assert extractions["emd"].status == VerificationStatus.MISSING
    
    # Indicative Value was omitted
    assert extractions["indicative_value"].extracted_value == "—"
    assert extractions["indicative_value"].status == VerificationStatus.MISSING

def test_indicative_value_not_confused_with_turnover():
    pdf_path = FIXTURES / "scenario_8_multiple_financial_amounts.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    extractions = extraction_engine.extract_parameters(doc)
    
    # In scenario 8, bidder turnover was 50 Crores, but estimated tender value was omitted
    # Must NOT extract turnover as indicative value
    assert "50 Crores" not in extractions["indicative_value"].extracted_value
    assert extractions["indicative_value"].extracted_value == "—"

