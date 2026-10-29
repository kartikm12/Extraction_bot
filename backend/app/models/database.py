import sqlite3
import json
from pathlib import Path
from typing import Optional, List, Dict, Any
from datetime import datetime
from backend.app.config import settings
from backend.app.models.schemas import (
    DocumentProcessingRecord, ParameterExtraction, ConflictDetail,
    ProcessingStage, VerificationStatus
)

DB_PATH = Path(settings.DATABASE_URL.replace("sqlite:///", ""))

def get_db_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    # Enable WAL mode for high concurrency
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        document_id TEXT PRIMARY KEY,
        original_filename TEXT NOT NULL,
        stored_filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size_bytes INTEGER NOT NULL,
        page_count INTEGER NOT NULL,
        current_stage TEXT NOT NULL,
        stage_progress_pct INTEGER DEFAULT 0,
        stages_completed TEXT,
        has_conflicts INTEGER DEFAULT 0,
        has_missing_values INTEGER DEFAULT 0,
        requires_human_review INTEGER DEFAULT 0,
        is_fully_verified INTEGER DEFAULT 0,
        error_message TEXT,
        pages_meta TEXT,
        parameters_json TEXT,
        conflicts_json TEXT,
        word_report_path TEXT,
        verification_xlsx_path TEXT,
        audit_json_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        document_id TEXT NOT NULL,
        parameter_key TEXT,
        action TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        reviewer_comment TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (document_id) REFERENCES documents (document_id)
    )
    """)
    conn.commit()
    conn.close()

def save_document(record: DocumentProcessingRecord):
    conn = get_db_connection()
    cursor = conn.cursor()
    now_str = datetime.utcnow().isoformat()
    
    # Serialize parameters and conflicts safely with datetime handling
    params_dict = {}
    for k, v in record.parameters.items():
        if hasattr(v, "dict"):
            params_dict[k] = v.dict()
        elif hasattr(v, "model_dump"):
            params_dict[k] = v.model_dump()
        else:
            params_dict[k] = v

    conflicts_list = []
    for c in record.conflicts:
        if hasattr(c, "dict"):
            conflicts_list.append(c.dict())
        elif hasattr(c, "model_dump"):
            conflicts_list.append(c.model_dump())
        else:
            conflicts_list.append(c)

    pages_meta_list = []
    for p in record.pages_meta:
        if hasattr(p, "dict"):
            pages_meta_list.append(p.dict())
        elif hasattr(p, "model_dump"):
            pages_meta_list.append(p.model_dump())
        else:
            pages_meta_list.append(p)

    stages_list = json.dumps(record.stages_completed) if isinstance(record.stages_completed, list) else str(record.stages_completed)
    stage_val = record.current_stage.value if hasattr(record.current_stage, "value") else str(record.current_stage)
    
    cursor.execute("""
    INSERT INTO documents (
        document_id, original_filename, stored_filename, file_type, file_size_bytes,
        page_count, current_stage, stage_progress_pct, stages_completed,
        has_conflicts, has_missing_values, requires_human_review, is_fully_verified,
        error_message, pages_meta, parameters_json, conflicts_json,
        word_report_path, verification_xlsx_path, audit_json_path,
        created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(document_id) DO UPDATE SET
        current_stage=excluded.current_stage,
        stage_progress_pct=excluded.stage_progress_pct,
        stages_completed=excluded.stages_completed,
        has_conflicts=excluded.has_conflicts,
        has_missing_values=excluded.has_missing_values,
        requires_human_review=excluded.requires_human_review,
        is_fully_verified=excluded.is_fully_verified,
        error_message=excluded.error_message,
        pages_meta=excluded.pages_meta,
        parameters_json=excluded.parameters_json,
        conflicts_json=excluded.conflicts_json,
        word_report_path=excluded.word_report_path,
        verification_xlsx_path=excluded.verification_xlsx_path,
        audit_json_path=excluded.audit_json_path,
        updated_at=excluded.updated_at
    """, (
        record.document_id,
        record.original_filename,
        record.stored_filename,
        record.file_type,
        record.file_size_bytes,
        record.page_count,
        stage_val,
        record.stage_progress_pct,
        stages_list,
        1 if record.has_conflicts else 0,
        1 if record.has_missing_values else 0,
        1 if record.requires_human_review else 0,
        1 if record.is_fully_verified else 0,
        record.error_message,
        json.dumps(pages_meta_list, default=str),
        json.dumps(params_dict, default=str),
        json.dumps(conflicts_list, default=str),
        record.word_report_path,
        record.verification_xlsx_path,
        record.audit_json_path,
        record.created_at.isoformat() if hasattr(record.created_at, "isoformat") else str(record.created_at),
        now_str
    ))
    conn.commit()
    conn.close()

def get_document(document_id: str) -> Optional[DocumentProcessingRecord]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM documents WHERE document_id = ?", (document_id,))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    
    params_dict = json.loads(row["parameters_json"]) if row["parameters_json"] else {}
    parameters = {k: ParameterExtraction(**v) for k, v in params_dict.items()}
    
    conflicts_list = json.loads(row["conflicts_json"]) if row["conflicts_json"] else []
    conflicts = [ConflictDetail(**c) for c in conflicts_list]
    
    pages_meta_list = json.loads(row["pages_meta"]) if row["pages_meta"] else []
    
    stages_completed = json.loads(row["stages_completed"]) if row["stages_completed"] else []
    
    return DocumentProcessingRecord(
        document_id=row["document_id"],
        original_filename=row["original_filename"],
        stored_filename=row["stored_filename"],
        file_type=row["file_type"],
        file_size_bytes=row["file_size_bytes"],
        page_count=row["page_count"],
        current_stage=ProcessingStage(row["current_stage"]),
        stage_progress_pct=row["stage_progress_pct"],
        stages_completed=stages_completed,
        has_conflicts=bool(row["has_conflicts"]),
        has_missing_values=bool(row["has_missing_values"]),
        requires_human_review=bool(row["requires_human_review"]),
        is_fully_verified=bool(row["is_fully_verified"]),
        error_message=row["error_message"],
        pages_meta=pages_meta_list,
        parameters=parameters,
        conflicts=conflicts,
        word_report_path=row["word_report_path"],
        verification_xlsx_path=row["verification_xlsx_path"],
        audit_json_path=row["audit_json_path"],
        created_at=datetime.fromisoformat(row["created_at"]),
        updated_at=datetime.fromisoformat(row["updated_at"])
    )

def log_audit_action(document_id: str, action: str, parameter_key: Optional[str] = None,
                     old_value: Optional[str] = None, new_value: Optional[str] = None,
                     reviewer_comment: Optional[str] = None):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO audit_logs (document_id, parameter_key, action, old_value, new_value, reviewer_comment, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        document_id, parameter_key, action, old_value, new_value,
        reviewer_comment, datetime.utcnow().isoformat()
    ))
    conn.commit()
    conn.close()

def get_dashboard_stats() -> Dict[str, Any]:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT COUNT(*) FROM documents")
    total = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM documents WHERE is_fully_verified = 1 AND error_message IS NULL")
    successful = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM documents WHERE requires_human_review = 1")
    requiring_review = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM documents WHERE has_conflicts = 1")
    conflicts = cursor.fetchone()[0]
    
    cursor.execute("SELECT COUNT(*) FROM documents WHERE error_message IS NOT NULL")
    failures = cursor.fetchone()[0]
    
    cursor.execute("""
    SELECT document_id, original_filename, file_type, page_count, current_stage,
           has_conflicts, has_missing_values, requires_human_review, is_fully_verified,
           created_at
    FROM documents
    ORDER BY created_at DESC
    LIMIT 20
    """)
    recent = [dict(row) for row in cursor.fetchall()]
    conn.close()
    
    return {
        "total_processed": total,
        "successfully_processed": successful,
        "requiring_review": requiring_review,
        "with_conflicts": conflicts,
        "with_failures": failures,
        "recent_history": recent
    }

def delete_document(document_id: str) -> bool:
    """Delete a document record, related audit logs, and artifacts from disk."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT stored_filename, word_report_path, verification_xlsx_path, audit_json_path FROM documents WHERE document_id = ?", (document_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return False

    # Clean up associated files if they exist
    paths_to_clean = [
        settings.UPLOAD_PATH / row["stored_filename"] if row["stored_filename"] else None,
        Path(row["word_report_path"]) if row["word_report_path"] else None,
        Path(row["verification_xlsx_path"]) if row["verification_xlsx_path"] else None,
        Path(row["audit_json_path"]) if row["audit_json_path"] else None,
    ]
    for p in paths_to_clean:
        if p and p.exists():
            try:
                p.unlink()
            except Exception:
                pass

    cursor.execute("DELETE FROM audit_logs WHERE document_id = ?", (document_id,))
    cursor.execute("DELETE FROM documents WHERE document_id = ?", (document_id,))
    conn.commit()
    conn.close()
    return True

# Initialize DB on module import
init_db()
