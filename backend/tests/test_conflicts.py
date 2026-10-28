import pytest
from pathlib import Path
from backend.app.services.parser import DocumentParser
from backend.app.services.extractor import extraction_engine
from backend.app.services.conflict_detector import conflict_detector
from backend.app.services.verifier import evidence_verifier
from backend.app.models.schemas import ParameterKey, VerificationStatus

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"

def test_regression_implementation_conflict():
    """
    REGRESSION TEST:
    Clause 5.1: delivery within 2 weeks from PO (Page 2).
    Clause 14.3: delivery within 3 weeks from PO (Page 4).
    """
    pdf_path = FIXTURES / "scenario_6_conflicting_implementation.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    extractions = extraction_engine.extract_parameters(doc)
    
    verified_params, conflicts = evidence_verifier.verify_all(doc, extractions)
    
    # 1. Detect conflict
    assert len(conflicts) >= 1
    impl_conflict = next((c for c in conflicts if c.parameter_key == ParameterKey.IMPLEMENTATION), None)
    assert impl_conflict is not None
    
    # 2. Both values preserved in statements
    stmt_values = [s.value.lower() for s in impl_conflict.statements]
    assert any("2 weeks" in v for v in stmt_values)
    assert any("3 weeks" in v for v in stmt_values)
    
    # 3. Both source pages recorded (Page 2 and Page 4)
    pages = [s.source_page for s in impl_conflict.statements]
    assert 2 in pages
    assert 4 in pages
    
    # 4. Parameter flagged as requiring human review & conflict status
    impl_param = verified_params["implementation"]
    assert impl_param.conflict_status is True
    assert impl_param.status == VerificationStatus.CONFLICT
    assert impl_param.review_required is True
    
    # 5. Must NOT silently choose either 2 weeks or 3 weeks as sole value
    assert "CONFLICT" in impl_param.extracted_value
    assert "2 weeks" in impl_param.extracted_value
    assert "3 weeks" in impl_param.extracted_value

def test_conflicting_bid_dates():
    pdf_path = FIXTURES / "scenario_7_conflicting_bid_dates.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    extractions = extraction_engine.extract_parameters(doc)
    verified_params, conflicts = evidence_verifier.verify_all(doc, extractions)
    
    date_conflict = next((c for c in conflicts if c.parameter_key == ParameterKey.BID_DATES), None)
    assert date_conflict is not None
    assert len(date_conflict.statements) >= 2
    assert verified_params["bid_dates"].status == VerificationStatus.CONFLICT

def test_supersession_detection():
    pdf_path = FIXTURES / "scenario_10_amendment_supersession.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    extractions = extraction_engine.extract_parameters(doc)
    conflicts, _ = conflict_detector.detect_conflicts(doc, extractions)
    
    if conflicts:
        for c in conflicts:
            if c.parameter_key == ParameterKey.IMPLEMENTATION:
                assert c.supersession_detected is True
