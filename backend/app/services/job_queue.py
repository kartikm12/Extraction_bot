import asyncio
import logging
from pathlib import Path
from typing import Optional, Dict
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor

from backend.app.config import settings
from backend.app.models.schemas import (
    DocumentProcessingRecord, ProcessingStage, VerificationStatus
)
from backend.app.models.database import save_document, get_document, log_audit_action
from backend.app.services.parser import DocumentParser
from backend.app.services.extractor import extraction_engine
from backend.app.services.verifier import evidence_verifier
from backend.app.services.docx_generator import docx_generator
from backend.app.services.xlsx_generator import xlsx_generator

logger = logging.getLogger(__name__)

class DocumentProcessingJob:
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=3)

    def enqueue_document(self, record: DocumentProcessingRecord, file_path: Path):
        """Asynchronously process the uploaded tender document through all 8 stages."""
        self.executor.submit(self._process_pipeline, record.document_id, file_path)

    def _process_pipeline(self, document_id: str, file_path: Path):
        record = get_document(document_id)
        if not record:
            logger.error(f"Cannot find document record {document_id}")
            return

        try:
            # Stage 1: File uploaded
            record.current_stage = ProcessingStage.FILE_UPLOADED
            record.stage_progress_pct = 12
            record.stages_completed.append(ProcessingStage.FILE_UPLOADED.value)
            save_document(record)

            # Stage 2: Document parsed
            record.current_stage = ProcessingStage.DOCUMENT_PARSED
            record.stage_progress_pct = 25
            parsed_doc = DocumentParser.parse_document(file_path)
            record.page_count = parsed_doc.page_count
            record.pages_meta = parsed_doc.get_pages_meta()
            record.stages_completed.append(ProcessingStage.DOCUMENT_PARSED.value)
            save_document(record)

            # Stage 3: OCR completed where necessary
            record.current_stage = ProcessingStage.OCR_COMPLETED
            record.stage_progress_pct = 38
            # OCR is integrated inside DocumentParser; record OCR warnings if any
            ocr_warnings = []
            for p in record.pages_meta:
                if p.warnings:
                    ocr_warnings.extend(p.warnings)
            record.stages_completed.append(ProcessingStage.OCR_COMPLETED.value)
            save_document(record)

            # Stage 4: Parameters extracted
            record.current_stage = ProcessingStage.PARAMETERS_EXTRACTED
            record.stage_progress_pct = 50
            initial_extractions = extraction_engine.extract_parameters(parsed_doc)
            record.parameters = initial_extractions
            record.stages_completed.append(ProcessingStage.PARAMETERS_EXTRACTED.value)
            save_document(record)

            # Stage 5 & 6: Evidence verified & Conflicts checked
            record.current_stage = ProcessingStage.EVIDENCE_VERIFIED
            record.stage_progress_pct = 65
            verified_params, detected_conflicts = evidence_verifier.verify_all(parsed_doc, initial_extractions)
            record.parameters = verified_params
            record.conflicts = detected_conflicts
            record.stages_completed.append(ProcessingStage.EVIDENCE_VERIFIED.value)

            record.current_stage = ProcessingStage.CONFLICTS_CHECKED
            record.stage_progress_pct = 75
            record.has_conflicts = len(detected_conflicts) > 0
            record.has_missing_values = any(p.status == VerificationStatus.MISSING for p in verified_params.values())
            
            # Determine if human review is needed
            needs_review = (
                record.has_conflicts or
                any(p.status in [VerificationStatus.NEEDS_REVIEW, VerificationStatus.OCR_FAILURE] for p in verified_params.values())
            )
            record.requires_human_review = needs_review
            record.stages_completed.append(ProcessingStage.CONFLICTS_CHECKED.value)
            save_document(record)

            # Stage 7: Human review required flag
            if needs_review:
                record.current_stage = ProcessingStage.HUMAN_REVIEW_REQUIRED
                record.stage_progress_pct = 85
                record.is_fully_verified = False
                record.stages_completed.append(ProcessingStage.HUMAN_REVIEW_REQUIRED.value)
                save_document(record)
            else:
                record.is_fully_verified = True

            # Stage 8: Reports generated
            record.current_stage = ProcessingStage.REPORT_GENERATED
            record.stage_progress_pct = 100
            
            word_path = docx_generator.generate_report(
                document_id=record.document_id,
                original_filename=record.original_filename,
                parameters=record.parameters
            )
            xlsx_path, json_path = xlsx_generator.generate_logs(
                document_id=record.document_id,
                original_filename=record.original_filename,
                parameters=record.parameters,
                conflicts=record.conflicts,
                ocr_warnings=ocr_warnings,
                created_at=record.created_at
            )
            
            record.word_report_path = str(word_path)
            record.verification_xlsx_path = str(xlsx_path)
            record.audit_json_path = str(json_path)
            record.stages_completed.append(ProcessingStage.REPORT_GENERATED.value)
            
            save_document(record)
            log_audit_action(document_id, "PROCESSING_COMPLETED", reviewer_comment="Pipeline executed successfully")
            logger.info(f"Processing completed for {document_id}")

        except Exception as e:
            logger.error(f"Pipeline error for document {document_id}: {e}", exc_info=True)
            record.error_message = str(e)
            save_document(record)
            log_audit_action(document_id, "PROCESSING_FAILED", reviewer_comment=str(e))

processing_job = DocumentProcessingJob()
