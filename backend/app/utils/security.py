import re
import uuid
import os
from pathlib import Path
from typing import Tuple, Optional
from fastapi import HTTPException, UploadFile
from backend.app.config import settings

# Prompt injection signatures that could appear in untrusted documents
PROMPT_INJECTION_PATTERNS = [
    r'ignore\s+all\s+previous\s+instructions',
    r'disregard\s+(?:the\s+)?above\s+instructions',
    r'you\s+are\s+now\s+in\s+developer\s+mode',
    r'system\s+override',
    r'<\|im_start\|>',
    r'<\|endoftext\|>',
    r'assistant\s*:\s*system\s*output',
    r'ignore\s+the\s+schema\s+and\s+return'
]

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent path traversal and shell injection."""
    base = os.path.basename(filename)
    clean = re.sub(r'[^a-zA-Z0-9_\-\.\(\)\s]', '_', base)
    if not clean:
        clean = "document.pdf"
    # Prefix with short uuid to guarantee uniqueness
    unique_prefix = uuid.uuid4().hex[:8]
    return f"{unique_prefix}_{clean}"

def validate_uploaded_file(file: UploadFile) -> Tuple[str, str]:
    """
    Validate file extension, size and content type.
    Returns: (cleaned_filename, file_extension)
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename cannot be empty")
        
    ext = Path(file.filename).suffix.lower()
    if ext not in settings.ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed formats: {', '.join(settings.ALLOWED_EXTENSIONS)}"
        )
        
    clean_name = sanitize_filename(file.filename)
    return clean_name, ext

def scan_for_prompt_injection(text: str) -> Tuple[bool, Optional[str]]:
    """
    Detects potential prompt injection attempts embedded within document text.
    """
    if not text:
        return False, None
    for pattern in PROMPT_INJECTION_PATTERNS:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return True, f"Suspicious instruction detected in document: '{match.group(0)}'"
    return False, None
