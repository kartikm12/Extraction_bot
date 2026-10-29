export type ParameterKey =
  | 'tender_no'
  | 'authority'
  | 'objective'
  | 'core_scope'
  | 'implementation'
  | 'om'
  | 'selection'
  | 'consortium'
  | 'bid_dates'
  | 'emd'
  | 'performance_security'
  | 'indicative_value';

export type VerificationStatus =
  | 'Verified'
  | 'Missing from source'
  | 'Needs review'
  | 'Conflicting'
  | 'OCR or extraction failure'
  | 'Corrected by reviewer';

export interface ConflictStatement {
  value: string;
  source_page: number;
  source_excerpt: string;
  section_context?: string;
}

export interface ConflictDetail {
  parameter_key: ParameterKey;
  parameter_name: string;
  description: string;
  statements: ConflictStatement[];
  detected_at?: string;
  is_resolved?: boolean;
  supersession_detected?: boolean;
  supersession_clause?: string;
  resolution_note?: string;
}

export interface ParameterExtraction {
  parameter_key: ParameterKey;
  display_name: string;
  extracted_value: string;
  source_pages: number[];
  exact_supporting_text: string;
  section_or_table?: string;
  status: VerificationStatus;
  confidence_score: number;
  confidence_indicator: 'High' | 'Medium' | 'Low';
  conflict_status: boolean;
  conflict_details?: ConflictDetail[];
  review_required: boolean;
  review_reason?: string;
  ocr_warning?: string;
  final_value?: string;
  reviewer_comment?: string;
  reviewer_decision?: 'Approved' | 'Corrected' | 'Flagged';
  reviewed_at?: string;
}

export interface PageMetadata {
  page_number: number;
  text_length: number;
  has_tables: boolean;
  is_scanned: boolean;
  ocr_applied: boolean;
  ocr_quality?: string;
  warnings: string[];
}

export interface DocumentProcessingRecord {
  document_id: string;
  original_filename: string;
  stored_filename: string;
  file_type: string;
  file_size_bytes: number;
  page_count: number;
  current_stage: string;
  stage_progress_pct: number;
  stages_completed: string[];
  has_conflicts: boolean;
  has_missing_values: boolean;
  requires_human_review: boolean;
  is_fully_verified: boolean;
  error_message?: string;
  pages_meta: PageMetadata[];
  parameters: Record<string, ParameterExtraction>;
  conflicts: ConflictDetail[];
  word_report_path?: string;
  verification_xlsx_path?: string;
  audit_json_path?: string;
  created_at: string;
  updated_at: string;
}

export interface DashboardStats {
  total_processed: number;
  successfully_processed: number;
  requiring_review: number;
  with_conflicts: number;
  with_failures: number;
  recent_history: Array<{
    document_id: string;
    original_filename: string;
    file_type: string;
    page_count: number;
    current_stage: string;
    has_conflicts: boolean;
    has_missing_values: boolean;
    requires_human_review: boolean;
    is_fully_verified: boolean;
    error_message?: string;
    created_at: string;
  }>;
}

export interface ReviewSubmitItem {
  parameter_key: ParameterKey;
  action: 'approve' | 'edit' | 'flag';
  corrected_value?: string;
  reviewer_comment?: string;
}

