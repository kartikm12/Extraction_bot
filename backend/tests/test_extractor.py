import pytest
from pathlib import Path
from backend.app.services.parser import DocumentParser
from backend.app.services.extractor import extraction_engine
from backend.app.models.schemas import ORDERED_PARAMETER_KEYS, ParameterKey, VerificationStatus

FIXTURES = Path(__file__).resolve().parent.parent / "fixtures"

def test_extract_12_parameters_schema():
    pdf_path = FIXTURES / "scenario_1_normal_tender.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    extractions = extraction_engine.extract_parameters(doc)
    
    # Must contain exactly the 12 predefined parameters
    assert len(extractions) == 12
    for k in ORDERED_PARAMETER_KEYS:
        assert k.value in extractions
        
    # Check specific fields
    assert "TSTS/HW/2026/089" in extractions["tender_no"].extracted_value
    assert "Telangana" in extractions["authority"].extracted_value
    assert "4 weeks" in extractions["implementation"].extracted_value
    assert "prohibited" in extractions["consortium"].extracted_value.lower()
    
    # Confirm Key Officials is not in extraction keys
    assert "key_officials" not in extractions
    assert "officials" not in extractions

def test_missing_parameters_become_em_dash():
    pdf_path = FIXTURES / "scenario_5_missing_parameters.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    extractions = extraction_engine.extract_parameters(doc)
    
    # EMD was omitted in scenario 5
    assert extractions["emd"].extracted_value == "—"
    assert extractions["emd"].status == VerificationStatus.MISSING
    
    # Indicative Value was omitted
    assert extractions["indicative_value"].extracted_value == "—"
    assert extractions["indicative_value"].status == VerificationStatus.MISSING

def test_indicative_value_not_confused_with_turnover():
    pdf_path = FIXTURES / "scenario_8_multiple_financial_amounts.pdf"
    doc = DocumentParser.parse_document(pdf_path)
    extractions = extraction_engine.extract_parameters(doc)
    
    # In scenario 8, bidder turnover was 50 Crores, but estimated tender value was omitted
    # Must NOT extract turnover as indicative value
    assert "50 Crores" not in extractions["indicative_value"].extracted_value
    assert extractions["indicative_value"].extracted_value == "—"

def test_extract_intermediate_education_tender():
    from backend.app.services.parser import ParsedPage, ParsedDocument
    
    page1 = ParsedPage(
        page_number=1,
        text="""
        Telangana Technology Services Ltd (TGTS)
        Tender Reference No: TGTS/1083720/DIE/2026
        Tender Call Notice for Supply and installation of IT equipment at the Office of the Director of Intermediate Education, Hyderabad.
        
        Telangana Technology Services Ltd. (TGTS) on behalf of the Office of the Director of Intermediate Education, Hyderabad.
        
        Schedule of Events:
        Bid Published On: 29/10/2026
        Pre Bid Queries: 31 October 2026, 3:00 PM, by email.
        Bid Submission Deadline: 5 November 2026, 3:00 PM
        
        Statement of Limits:
        EMD: ₹1,50,000/-
        Performance Security: 5% of the total contract/purchase order value.
        Delivery/Services Period: Delivery and installation within 2 weeks from the date of issue of Purchase Order.
        """,
        tables=[[
            ["Tender Reference No", "TGTS/1083720/DIE/2026"],
            ["EMD", "₹1,50,000/-"],
            ["Performance Security", "5% of the total contract/purchase order value."],
            ["Delivery Period", "Delivery and installation within 2 weeks from the date of issue of Purchase Order."],
            ["Evaluation Criteria", "L1 based"],
            ["Consortium", "Not permitted. Subcontracting is also not allowed."]
        ]]
    )
    
    page2 = ParsedPage(
        page_number=2,
        text="""
        Section A - Scope of Work
        Supply and installation of 7 Intel Core Ultra 7 All-in-One desktops, 27 Intel Core i5 All-in-One desktops, 5 laptops, 14 laser printers, 1 photocopier and 2 interactive flat panels.
        
        Section B - Eligibility Criteria
        Consortium is not allowed. Sub-contracting is also not allowed.
        
        Section C - Bid Evaluation Procedure
        Award criterion: Selection is L1 based.
        
        Section D - Warranty and Maintenance Terms
        Three-year warranty/contract period. Free maintenance, including spare parts, during the warranty period. The department may request annual maintenance and repairs after warranty at the rates quoted by the bidder. Maintenance engineers must respond within 48 hours of a complaint.
        """
    )
    
    doc = ParsedDocument("TGTS_DIE_2026.pdf", "pdf", [page1, page2])
    extractions = extraction_engine.extract_parameters(doc)
    
    assert "TGTS/1083720/DIE/2026" in extractions["tender_no"].extracted_value
    assert "Intermediate Education" in extractions["authority"].extracted_value
    assert "Supply and installation of IT equipment" in extractions["objective"].extracted_value
    assert "Intel Core Ultra 7" in extractions["core_scope"].extracted_value
    assert "27 Intel Core i5" in extractions["core_scope"].extracted_value
    assert "2 weeks" in extractions["implementation"].extracted_value
    assert "Three-year warranty" in extractions["om"].extracted_value or "48 hours" in extractions["om"].extracted_value
    assert "L1 based" in extractions["selection"].extracted_value
    assert "Not permitted" in extractions["consortium"].extracted_value
    assert "29/10/2026" in extractions["bid_dates"].extracted_value
    assert "5 November 2026" in extractions["bid_dates"].extracted_value
    assert "1,50,000" in extractions["emd"].extracted_value
    assert "5%" in extractions["performance_security"].extracted_value
    assert extractions["indicative_value"].extracted_value in ["—", "-"]

def test_extract_igrs_video_conference_tender():
    upload_path = Path("storage/uploads/TND-52A95E63_3b9f03c9_Tender Document.pdf")
    if not upload_path.exists():
        pytest.skip("IGRS tender PDF not found in uploads")

    doc = DocumentParser.parse_document(upload_path)
    extractions = extraction_engine.extract_parameters(doc)

    assert "TGTS/HWP/054/IGRS-VC/2026" in extractions["tender_no"].extracted_value
    assert "Registration and Stamps" in extractions["authority"].extracted_value
    assert "video-conferencing equipment" in extractions["objective"].extracted_value.lower() or "video conference" in extractions["objective"].extracted_value.lower()
    assert "98-inch 4K display" in extractions["core_scope"].extracted_value or "camera with speaker" in extractions["core_scope"].extracted_value
    assert "3 weeks" in extractions["implementation"].extracted_value
    assert "Registration Bhavan" in extractions["implementation"].extracted_value
    assert "Three-year" in extractions["om"].extracted_value or "3 years" in extractions["om"].extracted_value
    assert "L1" in extractions["selection"].extracted_value
    assert "Not specified" in extractions["consortium"].extracted_value
    assert "22 October 2026" in extractions["bid_dates"].extracted_value or "29 October 2026" in extractions["bid_dates"].extracted_value
    assert "80,000" in extractions["emd"].extracted_value
    assert "5%" in extractions["performance_security"].extracted_value
    assert extractions["indicative_value"].extracted_value == "—"

def test_extract_hmwssb_printers_tender():
    import glob
    fpaths = glob.glob("storage/uploads/*HMWSSB*.pdf")
    if not fpaths:
        pytest.skip("HMWSSB tender PDF not found in uploads")

    doc = DocumentParser.parse_document(Path(fpaths[0]))
    extractions = extraction_engine.extract_parameters(doc)

    assert "TGTS/CS/HMWSSB/Printers/2025" in extractions["tender_no"].extracted_value
    assert "15 October 2026" in extractions["tender_no"].extracted_value
    assert "HMWSSB" in extractions["authority"].extracted_value
    assert "Supply and installation of 80 or more printers" in extractions["objective"].extracted_value
    assert "80+ printers" in extractions["core_scope"].extracted_value
    assert "33 PPM" in extractions["core_scope"].extracted_value
    assert "2 weeks" in extractions["implementation"].extracted_value
    assert "3-year" in extractions["om"].extracted_value
    assert "24 hours" in extractions["om"].extracted_value
    assert "Three-part" in extractions["selection"].extracted_value or "L1" in extractions["selection"].extracted_value
    assert "Not permitted" in extractions["consortium"].extracted_value
    assert "15 October 2026" in extractions["bid_dates"].extracted_value
    assert "23 October 2026" in extractions["bid_dates"].extracted_value
    assert "1,00,000" in extractions["emd"].extracted_value
    assert "5%" in extractions["performance_security"].extracted_value
    assert extractions["indicative_value"].extracted_value == "—"




