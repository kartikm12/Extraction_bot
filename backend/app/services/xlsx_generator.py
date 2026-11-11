import json
import logging
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from backend.app.config import settings
from backend.app.models.schemas import (
    ParameterKey, ParameterExtraction, ConflictDetail,
    ORDERED_PARAMETER_KEYS, PARAMETER_DISPLAY_NAMES, VerificationStatus
)

logger = logging.getLogger(__name__)

class VerificationLogGenerator:
    """
    Generates human-readable Excel (.xlsx) and machine-readable JSON audit logs.
    Captures complete provenance, verification status, OCR quality, reviewer actions,
    and side-by-side evidence for all conflicts.
    """

    @staticmethod
    def generate_logs(document_id: str, original_filename: str,
                      parameters: Dict[str, ParameterExtraction],
                      conflicts: List[ConflictDetail],
                      ocr_warnings: Optional[List[str]] = None,
                      created_at: Optional[datetime] = None) -> tuple[Path, Path]:
        
        timestamp_str = (created_at or datetime.utcnow()).strftime("%Y-%m-%d %H:%M:%S UTC")
        
        xlsx_path = settings.REPORT_PATH / f"{document_id}_verification_log.xlsx"
        json_path = settings.REPORT_PATH / f"{document_id}_audit.json"

        # 1. Generate Excel (.xlsx)
        wb = openpyxl.Workbook()
        
        # Styles
        font_header = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        fill_header = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid")
        fill_conflict_hdr = PatternFill(start_color="9A3412", end_color="9A3412", fill_type="solid")
        
        thin_border_side = Side(border_style="thin", color="CBD5E1")
        border_all = Border(left=thin_border_side, right=thin_border_side, top=thin_border_side, bottom=thin_border_side)
        
        align_left = Alignment(horizontal="left", vertical="top", wrap_text=True)
        align_center = Alignment(horizontal="center", vertical="top")

        # ----------------- SHEET 1: Verification Log -----------------
        ws1 = wb.active
        ws1.title = "Parameter Verification Log"
        ws1.views.sheetView[0].showGridLines = True

        headers1 = [
            "Processing ID", "Original Filename", "Timestamp", "Parameter Name",
            "Initial Extracted Value", "Final Approved Value", "Source Page(s)",
            "Supporting Source Excerpt", "Confidence Indicator", "Verification Status",
            "Missing Info Status", "Conflict Status", "Conflict Description",
            "OCR / Parsing Warnings", "Reviewer Comments", "Review Decision & Time"
        ]

        ws1.append(headers1)
        for col_num in range(1, len(headers1) + 1):
            cell = ws1.cell(row=1, column=col_num)
            cell.font = font_header
            cell.fill = fill_header
            cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            cell.border = border_all
        ws1.row_dimensions[1].height = 28

        for row_idx, key in enumerate(ORDERED_PARAMETER_KEYS, start=2):
            param = parameters.get(key.value)
            display_name = PARAMETER_DISPLAY_NAMES[key]
            
            if param:
                init_val = param.extracted_value or "—"
                final_val = param.final_value or (init_val if param.status != VerificationStatus.CONFLICT else "—")
                source_pages_str = ", ".join(map(str, param.source_pages)) if param.source_pages else "None"
                excerpt = param.exact_supporting_text or ""
                conf_ind = param.confidence_indicator or "Low"
                status_val = param.status.value if hasattr(param.status, "value") else str(param.status)
                missing_val = "Yes (Missing)" if param.status == VerificationStatus.MISSING else "No"
                conflict_val = "Yes (Conflicting)" if param.conflict_status else "No"
                conflict_desc = param.review_reason if param.conflict_status else "None"
                ocr_warn = param.ocr_warning or "None"
                rev_comment = param.reviewer_comment or "None"
                rev_decision = f"{param.reviewer_decision} ({param.reviewed_at.isoformat()})" if param.reviewer_decision and param.reviewed_at else "Pending"
            else:
                init_val = "—"
                final_val = "—"
                source_pages_str = "None"
                excerpt = ""
                conf_ind = "Low"
                status_val = VerificationStatus.NEEDS_REVIEW.value
                missing_val = "No"
                conflict_val = "No"
                conflict_desc = "None"
                ocr_warn = "None"
                rev_comment = "None"
                rev_decision = "Pending"

            row_data = [
                document_id, original_filename, timestamp_str, display_name,
                init_val, final_val, source_pages_str, excerpt,
                conf_ind, status_val, missing_val, conflict_val,
                conflict_desc, ocr_warn, rev_comment, rev_decision
            ]
            ws1.append(row_data)

            # Styling data row
            for c_idx in range(1, len(row_data) + 1):
                c = ws1.cell(row=row_idx, column=c_idx)
                c.font = Font(name="Calibri", size=10)
                c.border = border_all
                c.alignment = align_left

                # Status color highlight
                if c_idx == 10:  # Verification Status
                    if status_val == VerificationStatus.VERIFIED.value:
                        c.fill = PatternFill(start_color="DCFCE7", end_color="DCFCE7", fill_type="solid")
                        c.font = Font(name="Calibri", size=10, bold=True, color="166534")
                    elif status_val == VerificationStatus.CONFLICT.value:
                        c.fill = PatternFill(start_color="FEE2E2", end_color="FEE2E2", fill_type="solid")
                        c.font = Font(name="Calibri", size=10, bold=True, color="991B1B")
                    elif status_val == VerificationStatus.MISSING.value:
                        c.fill = PatternFill(start_color="F1F5F9", end_color="F1F5F9", fill_type="solid")
                        c.font = Font(name="Calibri", size=10, color="64748B")
                    elif status_val == VerificationStatus.NEEDS_REVIEW.value:
                        c.fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
                        c.font = Font(name="Calibri", size=10, bold=True, color="92400E")

            ws1.row_dimensions[row_idx].height = 24

        # ----------------- SHEET 2: Conflicting Evidence Audit -----------------
        ws2 = wb.create_sheet(title="Conflicting Evidence Breakdown")
        ws2.views.sheetView[0].showGridLines = True

        headers2 = [
            "Parameter", "Conflict Description", "Statement / Duration",
            "Source Page", "Supporting Source Excerpt", "Section Context",
            "Supersession Status", "Resolution Note"
        ]
        ws2.append(headers2)
        for col_num in range(1, len(headers2) + 1):
            cell = ws2.cell(row=1, column=col_num)
            cell.font = font_header
            cell.fill = fill_conflict_hdr
            cell.alignment = Alignment(horizontal="center", vertical="center")
            cell.border = border_all
        ws2.row_dimensions[1].height = 26

        curr_row = 2
        if conflicts:
            for conf in conflicts:
                for stmt in conf.statements:
                    ws2.append([
                        conf.parameter_name,
                        conf.description,
                        stmt.value,
                        stmt.source_page,
                        stmt.source_excerpt,
                        stmt.section_context or f"Page {stmt.source_page}",
                        "Superseded" if conf.supersession_detected else "Unresolved Contradiction",
                        conf.resolution_note or "Requires Human Review"
                    ])
                    for c_idx in range(1, len(headers2) + 1):
                        c = ws2.cell(row=curr_row, column=c_idx)
                        c.font = Font(name="Calibri", size=10)
                        c.border = border_all
                        c.alignment = align_left
                        if c_idx == 4:
                            c.alignment = align_center
                    ws2.row_dimensions[curr_row].height = 24
                    curr_row += 1
        else:
            ws2.append(["All Parameters", "No material conflicts detected in this tender document.", "-", "-", "-", "-", "N/A", "Verified Consistent"])
            ws2.row_dimensions[curr_row].height = 22

        # Auto-adjust column widths for readability
        for sheet in [ws1, ws2]:
            for col in sheet.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    val_str = str(cell.value or "")
                    # Take first line if multiline
                    first_line = val_str.split("\n")[0]
                    max_len = max(max_len, len(first_line))
                sheet.column_dimensions[col_letter].width = min(45, max(12, max_len + 3))

        wb.save(str(xlsx_path))

        # 2. Generate Audit JSON
        audit_dict = {
            "processing_id": document_id,
            "original_filename": original_filename,
            "timestamp": timestamp_str,
            "parameters": {k: v.dict() for k, v in parameters.items()},
            "conflicts": [c.dict() for c in conflicts],
            "ocr_warnings": ocr_warnings or [],
            "generated_artifacts": {
                "word_summary": f"{document_id}_summary.docx",
                "verification_log_xlsx": f"{document_id}_verification_log.xlsx"
            }
        }
        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(audit_dict, f, indent=2, default=str)

        return xlsx_path, json_path

xlsx_generator = VerificationLogGenerator()

