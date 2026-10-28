import os
import fitz  # PyMuPDF
import docx
from PIL import Image, ImageDraw, ImageFont
import io
from pathlib import Path

FIXTURES_DIR = Path(__file__).resolve().parent
FIXTURES_DIR.mkdir(parents=True, exist_ok=True)

def create_pdf_page(doc, text_lines, title=None):
    page = doc.new_page(width=595, height=842)  # A4
    y = 50
    if title:
        page.insert_text((50, y), title, fontsize=14, fontname="helv", color=(0.1, 0.2, 0.5))
        y += 35
    for line in text_lines:
        if line.startswith("#"):
            page.insert_text((50, y), line.replace("#", "").strip(), fontsize=11, fontname="helv", color=(0.2, 0.2, 0.2))
            y += 22
        elif line.startswith("---"):
            page.draw_line((50, y), (545, y), color=(0.7, 0.7, 0.7), width=1)
            y += 15
        else:
            page.insert_text((50, y), line, fontsize=9.5, fontname="helv", color=(0.1, 0.1, 0.1))
            y += 16
    return page

def create_scenario_1_normal():
    doc = fitz.open()
    create_pdf_page(doc, [
        "TELANGANA STATE TECHNOLOGY SERVICES LIMITED (TSTS)",
        "Government of Telangana",
        "---",
        "Tender Notice / NIT No: TSTS/HW/2026/089",
        "Procuring Authority: Telangana State Technology Services Limited",
        "Objective: Supply, installation, and commissioning of IT Infrastructure for District Collectorates across Telangana",
        "Estimated Tender Value: Rs. 4,50,00,000/- (Rupees Four Crores Fifty Lakhs only)",
        "EMD Amount: Rs. 9,00,000/- via Bank Guarantee or Demand Draft in favor of TSTS",
        "---",
        "Critical Bid Schedule:",
        "Pre-bid Meeting Date: 10-Nov-2026 11:30 AM",
        "Bid Submission Deadline: 24-Nov-2026 03:00 PM",
        "Technical Bid Opening Date: 24-Nov-2026 04:00 PM"
    ], "NOTICE INVITING TENDER - SECTION I")
    
    create_pdf_page(doc, [
        "SECTION II - SCOPE OF WORK & TECHNICAL SPECIFICATIONS",
        "---",
        "Core Scope: Supply and commissioning of 500 Desktop Computers (Intel Core i7), 200 Laser Printers, and 50 Online UPS 10kVA systems.",
        "Delivery and Implementation: Delivery and installation within 4 weeks from Purchase Order issuance.",
        "O&M and Warranty: 3 years comprehensive on-site warranty followed by 2 years Annual Maintenance Contract (AMC).",
        "Selection Process: Evaluation based on Least Cost System (L1) among technically qualified bidders.",
        "Consortium: Consortium or Joint Venture is strictly prohibited. Single prime bidder only.",
        "Performance Security: 10% of contract value in the form of Bank Guarantee within 15 days of Award."
    ], "TECHNICAL & CONTRACTUAL TERMS")
    
    doc.save(str(FIXTURES_DIR / "scenario_1_normal_tender.pdf"))
    doc.close()

def create_scenario_2_scanned():
    doc = fitz.open()
    # Create an image containing text to simulate a scanned document
    img = Image.new('RGB', (1200, 1600), color=(250, 250, 250))
    d = ImageDraw.Draw(img)
    lines = [
        "GOVERNMENT OF ANDHRA PRADESH",
        "MEDICAL SERVICES & INFRASTRUCTURE DEVELOPMENT CORPORATION",
        "NIT Ref No: APMSIDC/2026/044/EQ",
        "Procuring Authority: APMSIDC",
        "Objective: Procurement of Biochemistry Analyzers for Medical Colleges",
        "Core Scope: Supply of 40 Units of Fully Automated Analyzers",
        "Delivery Timeline: Delivery within 6 weeks from PO",
        "Warranty: 3 years comprehensive warranty",
        "EMD: Rs. 5,00,000/-",
        "Performance Security: 5% of contract value",
        "Selection Process: Two-cover system, L1 commercial selection",
        "Consortium: Consortium is not allowed",
        "Bid Submission Closing: 30-Nov-2026 05:00 PM",
        "Estimated Tender Value: Rs. 2,00,00,000/-"
    ]
    y = 100
    for l in lines:
        d.text((100, y), l, fill=(20, 20, 20))
        y += 60
    
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG', quality=85)
    img_bytes = img_byte_arr.getvalue()
    
    page = doc.new_page(width=595, height=842)
    page.insert_image(page.rect, stream=img_bytes)
    doc.save(str(FIXTURES_DIR / "scenario_2_scanned_tender.pdf"))
    doc.close()

def create_scenario_3_mixed():
    doc = fitz.open()
    # Page 1 Native
    create_pdf_page(doc, [
        "GREATER HYDERABAD MUNICIPAL CORPORATION (GHMC)",
        "Tender Notice Ref: GHMC/IT/2026/112",
        "Procuring Authority: Greater Hyderabad Municipal Corporation",
        "Objective: Implementation of Automated Waste Management Surveillance",
        "Estimated Tender Value: Rs. 3,20,00,000/-"
    ], "GHMC TENDER NOTICE - NATIVE PAGE 1")
    
    # Page 2 Scanned image
    img = Image.new('RGB', (1000, 1400), color=(245, 245, 245))
    d = ImageDraw.Draw(img)
    d.text((80, 100), "ANNEXURE - SCAN COPY OF CERTIFICATE & SCHEDULE", fill=(30, 30, 30))
    d.text((80, 200), "Core Scope: Supply of 120 AI Surveillance Cameras and GPS Trackers", fill=(30, 30, 30))
    d.text((80, 300), "EMD: Rs. 6,40,000/- via Demand Draft", fill=(30, 30, 30))
    d.text((80, 400), "Delivery: Delivery within 4 weeks from Purchase Order", fill=(30, 30, 30))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG', quality=80)
    p2 = doc.new_page(width=595, height=842)
    p2.insert_image(p2.rect, stream=img_byte_arr.getvalue())
    
    # Page 3 Native
    create_pdf_page(doc, [
        "SECTION III - EVALUATION & SUBMISSION",
        "Selection: QCBS evaluation (70% technical, 30% financial)",
        "Bid Submission Closing: 18-Nov-2026 03:00 PM",
        "Performance Security: 10% of contract value",
        "Consortium: Consortium permitted with maximum 2 partners",
        "Warranty Period: 2 years on-site support"
    ], "GHMC TENDER - NATIVE PAGE 3")
    
    doc.save(str(FIXTURES_DIR / "scenario_3_mixed_scanned.pdf"))
    doc.close()

def create_scenario_4_word():
    doc = docx.Document()
    doc.add_heading("NORTHERN POWER DISTRIBUTION COMPANY OF TELANGANA LIMITED", level=1)
    doc.add_paragraph("Tender Specification No: TSNPDCL/CGM/2026/05")
    doc.add_paragraph("Procuring Authority: TSNPDCL, Warangal")
    doc.add_paragraph("Objective: Supply and erection of 33/11 KV Power Transformers")
    doc.add_paragraph("Core Scope: 25 Units of 5 MVA Power Transformers with all standard fittings and terminal connectors.")
    doc.add_paragraph("Delivery Period: Delivery within 8 weeks from Purchase Order.")
    doc.add_paragraph("Warranty: 5 years comprehensive warranty from the date of commissioning.")
    doc.add_paragraph("Selection Methodology: L1 commercial evaluation among technically responsive bidders.")
    doc.add_paragraph("Consortium: Consortium or Joint Venture is prohibited.")
    doc.add_paragraph("Bid Submission Deadline: 28-Nov-2026 01:00 PM")
    doc.add_paragraph("EMD: Rs. 12,50,000/-")
    doc.add_paragraph("Performance Security: 10% of total contract value.")
    doc.add_paragraph("Estimated Tender Value: Rs. 6,25,00,000/-")
    doc.save(str(FIXTURES_DIR / "scenario_4_word_tender.docx"))

def create_scenario_5_missing_params():
    doc = fitz.open()
    create_pdf_page(doc, [
        "DIRECTORATE OF MUNICIPAL ADMINISTRATION",
        "Tender Ref: DMA/CONSULT/2026/09",
        "Procuring Authority: Directorate of Municipal Administration",
        "Objective: Advisory services for urban sanitation policy preparation",
        "Core Scope: Preparation of Detailed Project Report and stakeholder consultation workshops",
        "Delivery Timeline: Implementation period of 12 weeks from Purchase Order",
        "Bid Submission Deadline: 14-Nov-2026 04:00 PM",
        "Selection Process: Quality and Cost Based Selection (QCBS)"
        # Note: EMD, Indicative Value, O&M, Performance Security, Consortium are deliberately omitted!
    ], "TENDER WITHOUT FINANCIAL VALUES OR EMD")
    doc.save(str(FIXTURES_DIR / "scenario_5_missing_parameters.pdf"))
    doc.close()

def create_scenario_6_regression_conflict():
    """
    CRUCIAL REGRESSION TEST from Master Prompt Section 6:
    - One clause specifies delivery and installation within 2 weeks from the Purchase Order.
    - Another clause in the financial bid section specifies 3 weeks from the Purchase Order.
    System must:
    1. Detect both statements refer to delivery and installation timeline.
    2. Preserve both values.
    3. Record source page for each.
    4. Flag Implementation as requiring human review.
    5. Avoid silently choosing either duration.
    """
    doc = fitz.open()
    # Page 1: General Notice
    create_pdf_page(doc, [
        "TELANGANA POLICE HOUSING CORPORATION",
        "NIT No: TPHC/ENG/2026/033",
        "Procuring Authority: Telangana Police Housing Corporation",
        "Objective: Supply and Installation of Modular Workstations",
        "Estimated Tender Value: Rs. 85,00,000/-",
        "EMD: Rs. 1,70,000/-",
        "Bid Submission Deadline: 20-Nov-2026 03:00 PM"
    ], "GENERAL TENDER NOTICE - PAGE 1")
    
    # Page 2: Clause 5.1 Delivery Timeline (Statement A: 2 weeks)
    create_pdf_page(doc, [
        "SECTION V - GENERAL CONDITIONS OF CONTRACT",
        "Clause 5.1 Delivery and Implementation Schedule:",
        "The successful contractor shall complete delivery and installation within 2 weeks from the Purchase Order.",
        "Core Scope: 300 Modular Workstations with fire-retardant partitions.",
        "O&M: 1 year warranty on all furniture hardware.",
        "Consortium: Joint Venture or Consortium is not allowed."
    ], "GCC - PAGE 2")
    
    # Page 3: Technical Specifications
    create_pdf_page(doc, [
        "SECTION VI - TECHNICAL SPECIFICATIONS",
        "Selection Process: Two-stage evaluation, Lowest Evaluated L1 Bidder.",
        "Performance Security: 5% of contract value."
    ], "SPECIFICATIONS - PAGE 3")
    
    # Page 4: Financial Bid Instructions (Statement B: 3 weeks)
    create_pdf_page(doc, [
        "SECTION VII - FINANCIAL BID SCHEDULE & PAYMENT TERMS",
        "Clause 14.3 Commercial Delivery Terms:",
        "Bidders must quote all-inclusive prices for delivery and installation within 3 weeks from the Purchase Order.",
        "Payments will be released post inspection."
    ], "FINANCIAL BID - PAGE 4")
    
    doc.save(str(FIXTURES_DIR / "scenario_6_conflicting_implementation.pdf"))
    doc.close()

def create_scenario_7_conflicting_dates():
    doc = fitz.open()
    create_pdf_page(doc, [
        "CENTRAL PUBLIC WORKS DEPARTMENT",
        "NIT No: CPWD/NZ/2026/512",
        "Procuring Authority: CPWD",
        "Objective: Renovation of Central Government Complex",
        "Bid Submission Deadline: 15-Nov-2026 03:00 PM"
    ], "NOTICE - PAGE 1")
    
    create_pdf_page(doc, [
        "SECTION II - CRITICAL DATES SCHEDULE",
        "Notice is hereby revised: Last date of submission: 22-Nov-2026 05:00 PM",
        "Technical Bid Opening: 23-Nov-2026 11:00 AM"
    ], "SCHEDULE - PAGE 2")
    
    doc.save(str(FIXTURES_DIR / "scenario_7_conflicting_bid_dates.pdf"))
    doc.close()

def create_scenario_8_multiple_financial_values():
    doc = fitz.open()
    create_pdf_page(doc, [
        "IRCTC CATERING SERVICES DIVISION",
        "Tender Ref: IRCTC/CAT/2026/78",
        "Procuring Authority: Indian Railway Catering and Tourism Corporation",
        "Objective: Supply of Packaged Drinking Water to Railway Stations",
        "Financial Qualifications of Bidder:",
        "- Bidder Minimum Annual Turnover: Rs. 50 Crores in last 3 financial years",
        "- Liquidated Damages Penalty: Rs. 10 Lakhs per instance of default",
        "- Earnest Money Deposit (EMD): Rs. 2 Lakhs via DD",
        "- Indicative ceiling unit price: Rs. 15 per bottle",
        "Note: Procuring authority has not specified any estimated tender value for this rate-contract procurement."
    ], "RATE CONTRACT PROCUREMENT")
    doc.save(str(FIXTURES_DIR / "scenario_8_multiple_financial_amounts.pdf"))
    doc.close()

def create_scenario_9_tables():
    doc = fitz.open()
    p = doc.new_page(width=595, height=842)
    p.insert_text((50, 50), "ANNEXURE A - SCHEDULE OF REQUIREMENTS (TABLE LAYOUT)", fontsize=13, fontname="helv", color=(0.1, 0.2, 0.6))
    
    table_text = (
        "Item No | Item Description | Quantity | Delivery Period\n"
        "1 | High End Workstation Servers | 15 Units | Within 4 weeks from Purchase Order\n"
        "2 | Network Core Switches 10G | 4 Units | Within 4 weeks from Purchase Order\n"
        "3 | SAN Storage 50TB | 2 Units | Within 4 weeks from Purchase Order\n\n"
        "Tender No: AP-IT-2026-TABLE\n"
        "Authority: AP Information Technology Dept\n"
        "Objective: Datacenter Compute Refresh\n"
        "Selection: L1 Cost Based Selection\n"
        "Warranty: 3 years on-site OEM warranty\n"
        "Consortium: Not allowed\n"
        "Bid Submission Deadline: 05-Dec-2026 03:00 PM\n"
        "EMD: Rs. 3,50,000/-\n"
        "Performance Security: 10% of PO Value\n"
        "Estimated Tender Value: Rs. 1,75,00,000/-"
    )
    p.insert_text((50, 90), table_text, fontsize=9.5, fontname="helv")
    doc.save(str(FIXTURES_DIR / "scenario_9_tables_and_annexures.pdf"))
    doc.close()

def create_scenario_10_supersession():
    doc = fitz.open()
    create_pdf_page(doc, [
        "MAHARASHTRA STATE ELECTRICITY TRANSMISSION CO",
        "Tender Ref: MSETCL/TRANS/2026/02",
        "Delivery Timeline: Delivery within 4 weeks from Purchase Order",
        "Estimated Tender Value: Rs. 5,00,00,000/-"
    ], "ORIGINAL TENDER - PAGE 1")
    
    create_pdf_page(doc, [
        "CORRIGENDUM NO. 1",
        "This Corrigendum supersedes all earlier delivery schedules:",
        "Revised Delivery Period: Delivery within 6 weeks from Purchase Order shall supersede the original 4 weeks clause.",
        "All other terms remain unchanged."
    ], "CORRIGENDUM - PAGE 2")
    doc.save(str(FIXTURES_DIR / "scenario_10_amendment_supersession.pdf"))
    doc.close()

def create_scenario_11_poor_quality():
    doc = fitz.open()
    # Create degraded grainy noisy image
    img = Image.new('RGB', (600, 800), color=(180, 180, 180))
    d = ImageDraw.Draw(img)
    d.text((50, 50), "x...?? ~~ blurred unreadable text noise %%", fill=(160, 160, 160))
    img_byte_arr = io.BytesIO()
    img.save(img_byte_arr, format='JPEG', quality=15)
    
    p = doc.new_page(width=595, height=842)
    p.insert_image(p.rect, stream=img_byte_arr.getvalue())
    doc.save(str(FIXTURES_DIR / "scenario_11_poor_quality_scan.pdf"))
    doc.close()

def create_scenario_12_corrupt():
    corrupt_path = FIXTURES_DIR / "scenario_12_corrupt_file.pdf"
    with open(corrupt_path, "wb") as f:
        f.write(b"%PDF-1.4 CORRUPTED_DATA_HEADER_GARBAGE_BYTES_TEST_REJECTION")

def create_scenario_13_long_tender():
    doc = fitz.open()
    create_pdf_page(doc, [
        "MINISTRY OF ROAD TRANSPORT AND HIGHWAYS",
        "NIT Reference: MORTH/NH/2026/01",
        "Procuring Authority: National Highways Authority of India (NHAI)",
        "Objective: Construction of 4-lane Highway Bypass",
        "Estimated Tender Value: Rs. 150,00,00,000/- (Rupees One Hundred Fifty Crores)",
        "EMD Amount: Rs. 1,50,00,000/-"
    ], "PAGE 1 - NOTICE")
    
    for page_idx in range(2, 26):
        lines = [f"Clause {page_idx}.{i}: Standard technical requirement and soil testing protocol details." for i in range(1, 15)]
        if page_idx == 12:
            lines.append("Core Scope: 28 km access-controlled bypass, 4 major bridges, 12 vehicular underpasses.")
        elif page_idx == 18:
            lines.append("Delivery Schedule: Completion within 24 months from Letter of Award.")
        elif page_idx == 20:
            lines.append("O&M Period: 5 years Defect Liability and Maintenance Period post completion.")
        elif page_idx == 22:
            lines.append("Consortium: Consortium allowed with up to 3 entities; Lead member min 51% equity.")
        elif page_idx == 24:
            lines.append("Bid Submission Deadline: 15-Dec-2026 05:00 PM")
            lines.append("Performance Security: 5% of total contract price.")
            lines.append("Selection: Single-stage two-envelope system, Lowest evaluated L1 bid.")
            
        create_pdf_page(doc, lines, f"SECTION {page_idx} - SPECIFICATIONS")
        
    doc.save(str(FIXTURES_DIR / "scenario_13_long_tender.pdf"))
    doc.close()

def create_all_fixtures():
    print("Generating test fixtures for scenarios 1-15...")
    create_scenario_1_normal()
    create_scenario_2_scanned()
    create_scenario_3_mixed()
    create_scenario_4_word()
    create_scenario_5_missing_params()
    create_scenario_6_regression_conflict()
    create_scenario_7_conflicting_dates()
    create_scenario_8_multiple_financial_values()
    create_scenario_9_tables()
    create_scenario_10_supersession()
    create_scenario_11_poor_quality()
    create_scenario_12_corrupt()
    create_scenario_13_long_tender()
    print("All fixtures generated successfully.")

if __name__ == "__main__":
    create_all_fixtures()
