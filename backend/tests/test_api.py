import pytest
from pathlib import Path
from backend.app.main import (
    health_check, get_dashboard, get_tender_status, get_tender_details,
    submit_review, regenerate_reports, download_word_summary, download_verification_log,
    download_audit_json, delete_tender
)
from backend.app.models.schemas import (
    DocumentProcessingRecord, ProcessingStage, VerificationStatus,
    ReviewSubmission, ReviewSubmitItem, ParameterKey, ParameterExtraction
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

def test_regenerate_reports_rechecks_uploaded_document():
    import shutil
    from backend.app.config import settings
    from backend.app.models.database import save_document, get_document
    
    doc_id = "TND-REGENCHECK01"
    sample_pdf = FIXTURES / "scenario_1_normal_tender.pdf"
    stored_name = f"{doc_id}_scenario_1_normal_tender.pdf"
    upload_target = settings.UPLOAD_PATH / stored_name
    shutil.copyfile(sample_pdf, upload_target)
    
    # Create record with deliberately outdated/missing parameter
    rec = DocumentProcessingRecord(
        document_id=doc_id,
        original_filename="scenario_1_normal_tender.pdf",
        stored_filename=stored_name,
        file_type="pdf",
        file_size_bytes=sample_pdf.stat().st_size,
        page_count=1,
        current_stage=ProcessingStage.PARAMETERS_EXTRACTED,
        stage_progress_pct=50,
        parameters={
            "tender_no": ParameterExtraction(
                parameter_key=ParameterKey.TENDER_NO,
                display_name="Tender No",
                extracted_value="—",
                source_pages=[],
                exact_supporting_text="",
                status=VerificationStatus.MISSING,
                confidence_score=0.1,
                confidence_indicator="Low",
                conflict_status=False
            )
        }
    )
    save_document(rec)
    
    # Calling regenerate_reports with recheck=True must re-read uploaded file and extract properly
    res = regenerate_reports(doc_id, recheck=True)
    assert res["document_id"] == doc_id
    
    updated_rec = get_document(doc_id)
    assert updated_rec is not None
    # Must have re-extracted Tender No from uploaded file
    assert "TSTS/HW/2026/089" in updated_rec.parameters["tender_no"].extracted_value
    assert updated_rec.parameters["tender_no"].status == VerificationStatus.VERIFIED
    assert len(updated_rec.parameters) == 12
    assert Path(updated_rec.word_report_path).exists()
    assert Path(updated_rec.verification_xlsx_path).exists()

def test_delete_tender_endpoint():
    doc_id = "TND-DELETETEST01"
    rec = DocumentProcessingRecord(
        document_id=doc_id,
        original_filename="delete_test.pdf",
        stored_filename="delete_test.pdf",
        file_type="pdf",
        file_size_bytes=1024,
        page_count=1,
        current_stage=ProcessingStage.REPORT_GENERATED,
        stage_progress_pct=100
    )
    save_document(rec)
    assert get_document(doc_id) is not None

    del_res = delete_tender(doc_id)
    assert del_res["document_id"] == doc_id
    assert get_document(doc_id) is None

    # Deleting non-existent document raises 404
    with pytest.raises(Exception):
        delete_tender("TND-NONEXISTENT")

