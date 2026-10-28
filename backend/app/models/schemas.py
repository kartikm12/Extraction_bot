from enum import Enum
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class ParameterKey(str, Enum):
    TENDER_NO = "tender_no"
    AUTHORITY = "authority"
    OBJECTIVE = "objective"
    CORE_SCOPE = "core_scope"
    IMPLEMENTATION = "implementation"
    OM = "om"
    SELECTION = "selection"
    CONSORTIUM = "consortium"
    BID_DATES = "bid_dates"
    EMD = "emd"
    PERFORMANCE_SECURITY = "performance_security"
    INDICATIVE_VALUE = "indicative_value"

PARAMETER_DISPLAY_NAMES = {
    ParameterKey.TENDER_NO: "Tender No",
    ParameterKey.AUTHORITY: "Authority",
    ParameterKey.OBJECTIVE: "Objective",
    ParameterKey.CORE_SCOPE: "Core Scope",
    ParameterKey.IMPLEMENTATION: "Implementation",
    ParameterKey.OM: "O&M",
    ParameterKey.SELECTION: "Selection",
    ParameterKey.CONSORTIUM: "Consortium",
    ParameterKey.BID_DATES: "Bid Dates",
    ParameterKey.EMD: "EMD",
    ParameterKey.PERFORMANCE_SECURITY: "Performance Security",
    ParameterKey.INDICATIVE_VALUE: "Indicative Value"
}

ORDERED_PARAMETER_KEYS = [
    ParameterKey.TENDER_NO,
    ParameterKey.AUTHORITY,
    ParameterKey.OBJECTIVE,
    ParameterKey.CORE_SCOPE,
    ParameterKey.IMPLEMENTATION,
    ParameterKey.OM,
    ParameterKey.SELECTION,
    ParameterKey.CONSORTIUM,
    ParameterKey.BID_DATES,
    ParameterKey.EMD,
    ParameterKey.PERFORMANCE_SECURITY,
    ParameterKey.INDICATIVE_VALUE,
]

class VerificationStatus(str, Enum):
    VERIFIED = "Verified"
    MISSING = "Missing from source"
    NEEDS_REVIEW = "Needs review"
    CONFLICT = "Conflicting"
    OCR_FAILURE = "OCR or extraction failure"
    CORRECTED = "Corrected by reviewer"

class ProcessingStage(str, Enum):
    FILE_UPLOADED = "File uploaded"
    DOCUMENT_PARSED = "Document parsed"
    OCR_COMPLETED = "OCR completed where necessary"
    PARAMETERS_EXTRACTED = "Parameters extracted"
    EVIDENCE_VERIFIED = "Evidence verified"
    CONFLICTS_CHECKED = "Conflicts and missing values checked"
    HUMAN_REVIEW_REQUIRED = "Human review required"
    REPORT_GENERATED = "Word report generated"

class ConflictStatement(BaseModel):
    value: str
    source_page: int
    source_excerpt: str
    section_context: Optional[str] = None

class ConflictDetail(BaseModel):
    parameter_key: ParameterKey
    parameter_name: str
    description: str
    statements: List[ConflictStatement] = Field(default_factory=list)
    detected_at: datetime = Field(default_factory=datetime.utcnow)
    is_resolved: bool = False
    supersession_detected: bool = False
    supersession_clause: Optional[str] = None
    resolution_note: Optional[str] = None

class ParameterExtraction(BaseModel):
    parameter_key: ParameterKey
    display_name: str
    extracted_value: str
    source_pages: List[int] = Field(default_factory=list)
    exact_supporting_text: str = ""
    section_or_table: Optional[str] = None
    status: VerificationStatus = VerificationStatus.NEEDS_REVIEW
    confidence_score: float = Field(ge=0.0, le=1.0, default=0.0)
    confidence_indicator: str = "Medium"  # High, Medium, Low
    conflict_status: bool = False
    conflict_details: Optional[List[ConflictDetail]] = None
    review_required: bool = False
    review_reason: Optional[str] = None
    ocr_warning: Optional[str] = None
    
    # Reviewer modifications
    final_value: Optional[str] = None
    reviewer_comment: Optional[str] = None
    reviewer_decision: Optional[str] = None  # Approved, Corrected, Flagged
    reviewed_at: Optional[datetime] = None

class PageMetadata(BaseModel):
    page_number: int
    text_length: int
    has_tables: bool
    is_scanned: bool
    ocr_applied: bool
    ocr_quality: Optional[str] = None  # Good, Degraded, Failed
    warnings: List[str] = Field(default_factory=list)

class DocumentProcessingRecord(BaseModel):
    document_id: str
    original_filename: str
    stored_filename: str
    file_type: str  # pdf, docx, doc
    file_size_bytes: int
    page_count: int
    current_stage: ProcessingStage
    stage_progress_pct: int = 0
    stages_completed: List[str] = Field(default_factory=list)
    has_conflicts: bool = False
    has_missing_values: bool = False
    requires_human_review: bool = False
    is_fully_verified: bool = False
    error_message: Optional[str] = None
    
    pages_meta: List[PageMetadata] = Field(default_factory=list)
    parameters: Dict[str, ParameterExtraction] = Field(default_factory=dict)
    conflicts: List[ConflictDetail] = Field(default_factory=list)
    
    word_report_path: Optional[str] = None
    verification_xlsx_path: Optional[str] = None
    audit_json_path: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ReviewSubmitItem(BaseModel):
    parameter_key: ParameterKey
    action: str  # approve, edit, flag
    corrected_value: Optional[str] = None
    reviewer_comment: Optional[str] = None

class ReviewSubmission(BaseModel):
    document_id: str
    reviews: List[ReviewSubmitItem]

class DashboardStats(BaseModel):
    total_processed: int
    successfully_processed: int
    requiring_review: int
    with_conflicts: int
    with_failures: int
    recent_history: List[Dict[str, Any]] = Field(default_factory=list)
