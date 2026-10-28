import pytest
from pathlib import Path
import docx
from backend.app.services.parser import DocumentParser
from backend.app.services.extractor import extraction_engine
from backend.app.services.docx_generator import docx_generator
from backend.app.models.schemas import ORDERED_PARAMETER_KEYS, PARAMETER_DISPLAY_NAMES

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"

def test_generate_docx_report(tmp_path):
    pdf_path = FIXTURES / "scenario_1_normal_tender.pdf"
    doc_parsed = DocumentParser.parse_document(pdf_path)
    extractions = extraction_engine.extract_parameters(doc_parsed)
    
    out_file = tmp_path / "test_report.docx"
    docx_generator.generate_report(
        document_id="TND-TEST01",
        original_filename="scenario_1_normal_tender.pdf",
        parameters=extractions,
        output_path=out_file
    )
    
    assert out_file.exists()
    assert out_file.stat().st_size > 5000
    
    # Read generated docx and inspect tables
    doc = docx.Document(out_file)
    assert len(doc.tables) == 1
    table = doc.tables[0]
    
    # 1 header row + exactly 12 data rows = 13 rows total
    assert len(table.rows) == 13
    assert len(table.columns) == 2
    
    # Check headers
    assert table.rows[0].cells[0].text == "Parameter"
    
    # Check that rows 1 to 12 strictly match ORDERED_PARAMETER_KEYS
    for i, key in enumerate(ORDERED_PARAMETER_KEYS, start=1):
        expected_name = PARAMETER_DISPLAY_NAMES[key]
        actual_name = table.rows[i].cells[0].text
        assert actual_name == expected_name
        
    # Check that Key Officials is NOT present anywhere
    full_docx_text = "\n".join([p.text for p in doc.paragraphs] + [c.text for r in table.rows for c in r.cells])
    assert "Key Officials" not in full_docx_text

