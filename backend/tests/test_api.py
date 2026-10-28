import pytest
from pathlib import Path
from backend.app.main import (
    health_check, get_dashboard, get_tender_status, get_tender_details,
    submit_review, regenerate_reports, download_word_summary, download_verification_log,
    download_audit_json
)
from backend.app.models.schemas import (
    DocumentProcessingRecord, ProcessingStage, VerificationStatus,
    ReviewSubmission, ReviewSubmitItem, ParameterKey
)
from backend.app.models.database import save_document, get_document
from backend.app.services.job_queue import processing_job

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"

def test_api_health_endpoint():
    res = health_check()
    assert res["status"] == "healthy"
    assert "version" in res
    assert "ai_provider" in res

def test_api_dashboard_endpoint():
    res = get_dashboard()
    assert "total_processed" in res
    assert "successfully_processed" in res
    assert "with_conflicts" in res

def test_tender_processing_and_endpoints():
    doc_id = "TND-APITEST01"
    sample_pdf = FIXTURES / "scenario_1_normal_tender.pdf"
    
    # Create record
    rec = DocumentProcessingRecord(
        document_id=doc_id,
        original_filename="scenario_1_normal_tender.pdf",
        stored_filename="scenario_1_normal_tender.pdf",
        file_type="pdf",
        file_size_bytes=sample_pdf.stat().st_size,
        page_count=2,
        current_stage=ProcessingStage.FILE_UPLOADED,
        stage_progress_pct=10
    )
    save_document(rec)
    
    # Run pipeline synchronously
    processing_job._process_pipeline(doc_id, sample_pdf)
    
    # Check status endpoint
    status_data = get_tender_status(doc_id)
    assert status_data["current_stage"] == "Word report generated"
    assert status_data["stage_progress_pct"] == 100
    
    # Check detail endpoint
    record_obj = get_tender_details(doc_id)
    assert len(record_obj.parameters) == 12
    assert "Telangana" in record_obj.parameters["authority"].extracted_value
    
    # Test review submission endpoint
    sub = ReviewSubmission(
        document_id=doc_id,
        reviews=[
            ReviewSubmitItem(
                parameter_key=ParameterKey.TENDER_NO,
                action="approve",
                reviewer_comment="Verified against header"
            )
        ]
    )
    rev_res = submit_review(doc_id, sub)
    assert rev_res["document_id"] == doc_id
    
    # Test regenerate endpoint
    regen_res = regenerate_reports(doc_id)
    assert regen_res["document_id"] == doc_id
    
    # Test download handlers return FileResponses with valid files
    w_resp = download_word_summary(doc_id)
    assert Path(w_resp.path).exists()
    
    x_resp = download_verification_log(doc_id)
    assert Path(x_resp.path).exists()
    
    j_resp = download_audit_json(doc_id)
    assert Path(j_resp.path).exists()
