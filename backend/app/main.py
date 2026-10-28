import os
import shutil
import uuid
from pathlib import Path
from typing import Optional, List
from datetime import datetime

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.app.config import settings
from backend.app.models.schemas import (
    DocumentProcessingRecord, ProcessingStage, VerificationStatus,
    ReviewSubmission, ParameterKey
)
from backend.app.models.database import (
    save_document, get_document, get_dashboard_stats, log_audit_action
)
from backend.app.services.job_queue import processing_job
from backend.app.services.docx_generator import docx_generator
from backend.app.services.xlsx_generator import xlsx_generator
from backend.app.utils.security import validate_uploaded_file, sanitize_filename

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Tender Analysis and Extraction Bot with Evidence Verification"
)

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "ai_provider": settings.AI_PROVIDER,
        "timestamp": datetime.utcnow().isoformat()
    }

@app.get("/api/dashboard")
def get_dashboard():
    return get_dashboard_stats()

@app.post("/api/tenders/upload")
async def upload_tender(file: UploadFile = File(...)):
    # Validate format & size
    clean_name, ext = validate_uploaded_file(file)
    doc_id = f"TND-{uuid.uuid4().hex[:8].upper()}"
    stored_filename = f"{doc_id}_{clean_name}"
    target_path = settings.UPLOAD_PATH / stored_filename

    # Read and validate size
    contents = await file.read()
    file_size_mb = len(contents) / (1024 * 1024)
    if file_size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File exceeds maximum allowed limit of {settings.MAX_FILE_SIZE_MB}MB (current: {file_size_mb:.1f}MB)"
        )

    # Save original file securely
    with open(target_path, "wb") as f:
        f.write(contents)

    # Create initial document record
    record = DocumentProcessingRecord(
        document_id=doc_id,
        original_filename=file.filename or clean_name,
        stored_filename=stored_filename,
        file_type=ext.replace(".", ""),
        file_size_bytes=len(contents),
        page_count=0,
        current_stage=ProcessingStage.FILE_UPLOADED,
        stage_progress_pct=10,
        stages_completed=[ProcessingStage.FILE_UPLOADED.value],
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    save_document(record)
    log_audit_action(doc_id, "FILE_UPLOADED", reviewer_comment=f"Original file '{file.filename}' saved")

    # Launch async background pipeline
    processing_job.enqueue_document(record, target_path)

    return {
        "message": "File uploaded successfully. Processing initiated.",
        "document_id": doc_id,
        "filename": file.filename,
        "file_size_bytes": len(contents),
        "stage": record.current_stage.value
    }

@app.get("/api/tenders/{document_id}/status")
def get_tender_status(document_id: str):
    record = get_document(document_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Tender record '{document_id}' not found.")
    
    return {
        "document_id": record.document_id,
        "current_stage": record.current_stage.value,
        "stage_progress_pct": record.stage_progress_pct,
        "stages_completed": record.stages_completed,
        "has_conflicts": record.has_conflicts,
        "has_missing_values": record.has_missing_values,
        "requires_human_review": record.requires_human_review,
        "is_fully_verified": record.is_fully_verified,
        "error_message": record.error_message
    }

@app.get("/api/tenders/{document_id}")
def get_tender_details(document_id: str):
    record = get_document(document_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Tender record '{document_id}' not found.")
    return record

@app.post("/api/tenders/{document_id}/review")
def submit_review(document_id: str, submission: ReviewSubmission):
    record = get_document(document_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Tender record '{document_id}' not found.")

    for item in submission.reviews:
        key_str = item.parameter_key.value
        if key_str in record.parameters:
            param = record.parameters[key_str]
            old_val = param.final_value or param.extracted_value
            action = item.action.lower()

            if action == "approve":
                param.status = VerificationStatus.VERIFIED
                param.reviewer_decision = "Approved"
                param.final_value = param.extracted_value
                param.review_required = False
            elif action == "edit":
                param.status = VerificationStatus.CORRECTED
                param.reviewer_decision = "Corrected"
                param.final_value = item.corrected_value or param.extracted_value
                param.review_required = False
            elif action == "flag":
                param.status = VerificationStatus.NEEDS_REVIEW
                param.reviewer_decision = "Flagged"
                param.review_required = True

            param.reviewer_comment = item.reviewer_comment
            param.reviewed_at = datetime.utcnow()

            log_audit_action(
                document_id=document_id,
                parameter_key=key_str,
                action=f"REVIEW_{action.upper()}",
                old_value=old_val,
                new_value=param.final_value,
                reviewer_comment=item.reviewer_comment
            )

    # Re-evaluate document level verification status
    unresolved_conflicts = any(p.status == VerificationStatus.CONFLICT for p in record.parameters.values())
    unresolved_reviews = any(p.status in [VerificationStatus.NEEDS_REVIEW, VerificationStatus.OCR_FAILURE] for p in record.parameters.values())
    
    record.requires_human_review = unresolved_conflicts or unresolved_reviews
    record.is_fully_verified = not record.requires_human_review
    save_document(record)

    return {"message": "Review submitted successfully", "document_id": document_id}

@app.post("/api/tenders/{document_id}/regenerate")
def regenerate_reports(document_id: str):
    record = get_document(document_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Tender record '{document_id}' not found.")

    # Regenerate Word report (.docx)
    word_path = docx_generator.generate_report(
        document_id=record.document_id,
        original_filename=record.original_filename,
        parameters=record.parameters
    )
    # Regenerate Verification logs (.xlsx and .json)
    xlsx_path, json_path = xlsx_generator.generate_logs(
        document_id=record.document_id,
        original_filename=record.original_filename,
        parameters=record.parameters,
        conflicts=record.conflicts,
        created_at=record.created_at
    )
    record.word_report_path = str(word_path)
    record.verification_xlsx_path = str(xlsx_path)
    record.audit_json_path = str(json_path)
    save_document(record)

    log_audit_action(document_id, "REPORTS_REGENERATED", reviewer_comment="Reports regenerated following review updates")
    return {"message": "Reports regenerated successfully", "document_id": document_id}

@app.get("/api/tenders/{document_id}/download/word")
def download_word_summary(document_id: str):
    record = get_document(document_id)
    if not record or not record.word_report_path:
        raise HTTPException(status_code=404, detail="Word report has not been generated yet.")
    
    path = Path(record.word_report_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Word report file not found on disk.")
        
    return FileResponse(
        path=path,
        filename=f"{record.document_id}_Executive_Summary.docx",
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )

@app.get("/api/tenders/{document_id}/download/xlsx")
def download_verification_log(document_id: str):
    record = get_document(document_id)
    if not record or not record.verification_xlsx_path:
        raise HTTPException(status_code=404, detail="Verification log has not been generated yet.")
    
    path = Path(record.verification_xlsx_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Verification log file not found on disk.")
        
    return FileResponse(
        path=path,
        filename=f"{record.document_id}_Verification_Log.xlsx",
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    )

@app.get("/api/tenders/{document_id}/download/json")
def download_audit_json(document_id: str):
    record = get_document(document_id)
    if not record or not record.audit_json_path:
        raise HTTPException(status_code=404, detail="Audit JSON has not been generated yet.")
    
    path = Path(record.audit_json_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Audit JSON file not found on disk.")
        
    return FileResponse(
        path=path,
        filename=f"{record.document_id}_Audit.json",
        media_type="application/json"
    )

# Serve built frontend if exists
FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")
