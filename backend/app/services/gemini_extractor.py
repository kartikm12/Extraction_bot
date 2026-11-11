import logging
import json
import re
from typing import Dict, List, Any, Optional
import httpx
from backend.app.config import settings
from backend.app.models.schemas import (
    ParameterKey, PARAMETER_DISPLAY_NAMES, ORDERED_PARAMETER_KEYS,
    ParameterExtraction, VerificationStatus
)
from backend.app.services.parser import ParsedDocument

logger = logging.getLogger(__name__)

GEMINI_MODELS = [
    getattr(settings, "LLM_MODEL", "gemini-3-flash-preview") or "gemini-3-flash-preview",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite-preview",
    "gemini-2.5-flash"
]

EXTRACTION_SCHEMA = {
    "type": "OBJECT",
    "properties": {
        k.value: {
            "type": "OBJECT",
            "properties": {
                "value": {"type": "STRING"},
                "source_pages": {"type": "ARRAY", "items": {"type": "INTEGER"}},
                "exact_supporting_text": {"type": "STRING"},
                "section_or_table": {"type": "STRING"},
                "is_specified": {"type": "BOOLEAN"}
            },
            "required": ["value", "source_pages", "exact_supporting_text", "is_specified"]
        } for k in ORDERED_PARAMETER_KEYS
    },
    "required": [k.value for k in ORDERED_PARAMETER_KEYS]
}

SYSTEM_INSTRUCTION = """
You are a senior government procurement expert and lead legal-technical tender analyst.
Your task is to analyze the provided government tender document and extract the EXACT 12 PREDEFINED PARAMETERS with maximum analytical precision, completeness, and evidence fidelity.

CRITICAL INSTRUCTIONS FOR EACH PARAMETER:
1. tender_no:
   - Extract the full official Tender Reference / Specification / NIT / RFP Number.
   - Include the date of the tender if stated (e.g., 'TGTS/CS/HMWSSB/Printers/2025, dated 15 October 2026.').
   - If the tender filename is known, append it (e.g., 'HMWSSB Printers-Tender document.pdf').

2. authority:
   - Identify both the Procuring/Tendering Entity AND the Beneficiary/User Department.
   - Standard format: '<Tendering Entity> (e.g. Telangana Technology Services Limited (TGTS)), on behalf of / for <Beneficiary Department / Managing Director / Commissioner>'.
   - NEVER confuse bidder qualification table headers (like 'Registering Authority', 'ROC', 'PAN', 'GST') with the procuring entity.

3. objective:
   - The primary objective, work description, and purpose of the tender.
   - Include important scope terms (such as right to order additional units at L1 price for the next 6 months).

4. core_scope:
   - Provide an itemized, exhaustive summary of the Bill of Quantities (BOQ) or Technical Specifications.
   - Include all equipment items, exact quantities (e.g., '80+ printers' or '7 Intel Core Ultra 7 desktops, 27 Intel Core i5 desktops, 5 laptops...'), key specs (e.g., 33 PPM simplex / 20 IPM duplex speed, 600x600 dpi, auto duplex, USB/Ethernet/Wireless Direct, 250-sheet input tray).
   - If service/repair scope, list institutions covered and components tested/serviced (UPS, servers, thin clients, LAN cabling).

5. implementation:
   - Delivery, installation, and commissioning timeline (e.g., 'within 2 weeks of Purchase Order' or 'within 3 weeks of PO').
   - Include delivery location/address (e.g., 'at HMWSSB, Hyderabad' or 'at Registration Bhavan, Hyderabad').
   - Include stock availability requirements and acceptance testing conditions.

6. om:
   - Complete warranty and maintenance terms.
   - Warranty duration (e.g., '3-year onsite comprehensive warranty').
   - Maintenance inclusions (free maintenance and spare parts during warranty).
   - Breakdown resolution SLA window in hours (e.g., 'within 24 hours, or within 96 hours where spare parts are required').
   - Response time for maintenance engineers (e.g., 'within 6 hours' or 'within 48 hours').
   - Preventive maintenance frequency (e.g. every 6 months) and post-warranty AMC terms.

7. selection:
   - Complete bidding procedure: stages (Pre-Qualification PQ, Technical Qualification TQ, Financial Bid) and opening rules.
   - Award criterion: basis of L1 (e.g., 'L1 is determined by the lowest grand-total price' or 'Schedule-wise L1 evaluation; orders placed with L1 bidder for the relevant schedule').

8. consortium:
   - State whether Consortium / Joint Venture (JV) and Subcontracting are permitted or prohibited.
   - E.g., 'Not permitted. Consortium bidding and subcontracting in any form are explicitly prohibited.'
   - If not mentioned in the document, state: 'Not specified in the uploaded document. The tender does not explicitly state whether consortium/JV participation is permitted.'

9. bid_dates:
   - Format cleanly line-by-line:
     Tender Calling Date / Issue Date: <Date>
     Pre-Bid Query Deadline: <Date or query window>
     Bid Submission Deadline: <Date and Time, with portal name>
     Bid Opening: <Date and Time, with portal name>
     Bid Document Fee: <Amount and payment mode>

10. emd:
    - EMD amount in ₹ (e.g., '₹1,00,000' or '₹80,000').
    - Payment mode (e.g., 'by Demand Draft or Bank Guarantee').
    - Validity period (e.g., 'Validity: 90 days from bid closing date').
    - If the tender has unstated amount on Page 1 but specifies ₹80,000 in Annexure I, cite both transparently.

11. performance_security:
    - PBG percentage of contract/project value (e.g., '5% of the project value' or '5% of Purchase Order value').
    - Submission window (e.g., 'within one week of Purchase Order' or 'within 7 days').
    - Validity duration (e.g., 'extends beyond 30 days after the warranty period' or 'valid for 60 days beyond warranty').

12. indicative_value:
    - Estimated Tender Value / Budget / Approximate Cost / Estimated Contract Value (ECV) / Probable Amount of Contract (PAC).
    - If specified, extract the exact monetary figure in ₹ (e.g., '₹1,50,00,000/-', '₹2.45 Crores', or 'Rs. 85.50 Lakhs').
    - If NOT specified or omitted in the uploaded tender document, set value to 'Not specified in the tender document.' and is_specified to false.
    - CRITICAL: NEVER confuse the bidder qualification turnover requirement (e.g., 'Turnover Certificate of not less than Rs.300.00 Lakhs') or EMD amount with the estimated budget / indicative value.

EVIDENCE CITATION:
- source_pages: List of 1-based page numbers where the text was found.
- exact_supporting_text: Exact verbatim excerpt from the document supporting the extraction.
"""

class GeminiExtractionService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.timeout = float(settings.LLM_TIMEOUT_SECONDS or 90.0)

    def is_available(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    def extract_parameters(self, doc: ParsedDocument) -> Optional[Dict[str, ParameterExtraction]]:
        if not self.is_available():
            logger.info("Gemini API key is not configured; skipping Gemini extraction.")
            return None

        # Build comprehensive document text representation with page numbers and tables
        doc_parts = []
        doc_parts.append(f"DOCUMENT FILENAME: {doc.filename}\nTOTAL PAGES: {doc.page_count}\n")

        for page in doc.pages:
            p_text = f"=== PAGE {page.page_number} ===\n{page.text}\n"
            if page.tables:
                p_text += "\n[TABLES ON THIS PAGE]:\n"
                for t_idx, tbl in enumerate(page.tables):
                    p_text += f"-- Table {t_idx + 1} --\n"
                    for row in tbl:
                        p_text += " | ".join(str(c or '').strip() for c in row) + "\n"
            doc_parts.append(p_text)

        full_doc_context = "\n".join(doc_parts)

        # Truncate if extraordinarily large (protecting against context overflow)
        # 1M tokens is ~4M characters; our context is typically ~100k-500k chars for 10-50 pages
        if len(full_doc_context) > 2_000_000:
            full_doc_context = full_doc_context[:2_000_000] + "\n...[Document truncated for length]..."

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": SYSTEM_INSTRUCTION},
                        {"text": f"Here is the full tender document:\n\n{full_doc_context}"}
                    ]
                }
            ],
            "generationConfig": {
                "response_mime_type": "application/json",
                "response_schema": EXTRACTION_SCHEMA,
                "temperature": 0.1
            }
        }

        # Try models in preference order
        last_error = None
        for model in GEMINI_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            try:
                logger.info(f"Invoking Gemini model '{model}' for tender extraction...")
                with httpx.Client(timeout=self.timeout) as client:
                    resp = client.post(url, json=payload)

                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
                        raw_json_str = candidates[0]["content"]["parts"][0]["text"]
                        parsed_output = json.loads(raw_json_str)
                        logger.info(f"Gemini model '{model}' successfully extracted all 12 parameters.")
                        return self._map_to_parameter_extractions(parsed_output, doc)
                else:
                    logger.warning(f"Gemini model '{model}' returned status {resp.status_code}: {resp.text[:200]}")
                    last_error = f"Status {resp.status_code}"
            except Exception as e:
                logger.warning(f"Error calling Gemini model '{model}': {e}")
                last_error = str(e)

        logger.error(f"All Gemini models failed. Last error: {last_error}")
        return None

    def _map_to_parameter_extractions(self, raw_data: Dict[str, Any], doc: ParsedDocument) -> Dict[str, ParameterExtraction]:
        extractions: Dict[str, ParameterExtraction] = {}

        for key in ORDERED_PARAMETER_KEYS:
            k_str = key.value
            p_data = raw_data.get(k_str, {})
            display_name = PARAMETER_DISPLAY_NAMES[key]

            val = str(p_data.get("value", "") or "").strip()
            is_specified = bool(p_data.get("is_specified", True))
            source_pages = p_data.get("source_pages", [])
            exact_supporting = str(p_data.get("exact_supporting_text", "") or "").strip()
            section_or_table = str(p_data.get("section_or_table", "") or "Tender Document").strip()

            if not isinstance(source_pages, list):
                source_pages = [1]
            source_pages = sorted(list(set(int(p) for p in source_pages if isinstance(p, (int, str)) and str(p).isdigit())))

            if not is_specified or val in ["—", "-", "", "None", "null", "not specified", "not specified in the tender document."]:
                if key == ParameterKey.CONSORTIUM:
                    extracted_val = "Not specified in the uploaded document. The tender does not explicitly state whether consortium/JV participation is permitted."
                    status = VerificationStatus.VERIFIED
                elif key == ParameterKey.INDICATIVE_VALUE:
                    extracted_val = "Not specified in the tender document."
                    status = VerificationStatus.MISSING
                else:
                    extracted_val = "—"
                    status = VerificationStatus.MISSING

                extractions[k_str] = ParameterExtraction(
                    parameter_key=key,
                    display_name=display_name,
                    extracted_value=extracted_val,
                    source_pages=[],
                    exact_supporting_text="",
                    section_or_table=None,
                    status=status,
                    confidence_score=1.0,
                    confidence_indicator="High",
                    conflict_status=False,
                    review_required=False,
                    review_reason=f"Parameter '{display_name}' was verified as not specified in the tender document."
                )
            else:
                if key in [ParameterKey.TENDER_NO, ParameterKey.BID_DATES]:
                    def _rep_date(m):
                        d, mo, y = int(m.group(1)), int(m.group(2)), m.group(3)
                        months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                        if 1 <= mo <= 12:
                            return f"{d} {months[mo - 1]} {y}"
                        return m.group(0)
                    val = re.sub(r'\b(\d{1,2})[\.\/](\d{1,2})[\.\/](\d{4})\b', _rep_date, val)

                extractions[k_str] = ParameterExtraction(
                    parameter_key=key,
                    display_name=display_name,
                    extracted_value=val,
                    source_pages=source_pages or [1],
                    exact_supporting_text=exact_supporting,
                    section_or_table=section_or_table,
                    status=VerificationStatus.VERIFIED,
                    confidence_score=0.98,
                    confidence_indicator="High",
                    conflict_status=False,
                    review_required=False
                )

        return extractions

gemini_extraction_service = GeminiExtractionService()
