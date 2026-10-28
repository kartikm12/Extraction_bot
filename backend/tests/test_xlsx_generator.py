import pytest
import json
from pathlib import Path
import openpyxl
from backend.app.services.parser import DocumentParser
from backend.app.services.extractor import extraction_engine
from backend.app.services.verifier import evidence_verifier
from backend.app.services.xlsx_generator import xlsx_generator

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"

def test_generate_verification_logs():
    pdf_path = FIXTURES / "scenario_6_conflicting_implementation.pdf"
    doc_parsed = DocumentParser.parse_document(pdf_path)
    extractions = extraction_engine.extract_parameters(doc_parsed)
    verified_params, conflicts = evidence_verifier.verify_all(doc_parsed, extractions)
    
    xlsx_path, json_path = xlsx_generator.generate_logs(
        document_id="TND-REGRESS",
        original_filename="scenario_6_conflicting_implementation.pdf",
        parameters=verified_params,
        conflicts=conflicts
    )
    
    assert xlsx_path.exists()
    assert json_path.exists()
    
    # Inspect workbook
    wb = openpyxl.load_workbook(xlsx_path)
    sheet_names = wb.sheetnames
    assert "Parameter Verification Log" in sheet_names
    assert "Conflicting Evidence Breakdown" in sheet_names
    
    ws1 = wb["Parameter Verification Log"]
    # 1 header + 12 parameter rows
    assert ws1.max_row == 13
    assert ws1.max_column >= 15
    
    # Inspect Sheet 2 (Conflicting breakdown)
    ws2 = wb["Conflicting Evidence Breakdown"]
    assert ws2.max_row >= 3  # Header + at least 2 conflicting statements
    
    # Inspect JSON
    with open(json_path, "r", encoding="utf-8") as f:
        audit_data = json.load(f)
    assert audit_data["processing_id"] == "TND-REGRESS"
    assert len(audit_data["parameters"]) == 12
    assert len(audit_data["conflicts"]) >= 1

