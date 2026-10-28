import re
import json
import logging
from typing import Dict, List, Any, Optional, Tuple
from backend.app.config import settings
from backend.app.models.schemas import (
    ParameterKey, PARAMETER_DISPLAY_NAMES, ORDERED_PARAMETER_KEYS,
    ParameterExtraction, VerificationStatus, ConflictDetail, ConflictStatement
)
from backend.app.services.parser import ParsedDocument, ParsedPage
from backend.app.utils.text_tools import normalize_text, extract_dates, extract_currency_amounts

logger = logging.getLogger(__name__)

# Keywords and regex patterns for targeted retrieval per parameter
PARAMETER_PATTERNS = {
    ParameterKey.TENDER_NO: [
        r'(?:Tender\s*Notice\s*/\s*NIT\s*(?:No|Ref)?|Tender\s*(?:Specification\s*No|Reference|Ref|No|Number|ID)|NIT\s*(?:No|Number|Ref)?|RFP\s*(?:No|Reference|Ref)?|Bid\s*No|Enquiry\s*No)[:\.\s-]*([A-Z0-9_\-\/]{4,50})',
        r'\b(?:NIT|RFP|TENDER)\s*[:#\.\s-]*([A-Z0-9_\-\/]{4,50})\b'
    ],
    ParameterKey.AUTHORITY: [
        r'(?:Procuring\s*Authority|Tender\s*Inviting\s*Authority|Department|Organization|Authority|Client|Purchaser|Issuer)[:\.\s-]*([^\n\r\.;]{5,150})',
        r'Government\s*of\s*[^\n\r]+',
        r'[A-Z\s]{3,60}(?:Corporation|Authority|Department|Directorate|Commission|Board|Limited|Ltd)'
    ],
    ParameterKey.OBJECTIVE: [
        r'(?:Objective|Purpose|Scope\s*and\s*Objective|Intent|Tender\s*is\s*invited\s*for|Invites\s*tender\s*for|Proposal\s*for)[:\.\s-]*([^\n\r]{15,400})',
        r'(?:Notice\s*Inviting\s*Tender|RFP)\s*(?:for|towards)\s*([^\n\r]{15,400})'
    ],
    ParameterKey.CORE_SCOPE: [
        r'(?:Core\s*Scope|Scope\s*of\s*Work|Broad\s*Scope|Scope\s*of\s*Supply|Deliverables|Item\s*Description)[:\.\s-]*([^\n\r]{20,500})',
        r'(?:Supply,\s*installation|Procurement\s*of|Turnkey\s*implementation)[^\n\r]{20,500}'
    ],
    ParameterKey.IMPLEMENTATION: [
        r'(?:Delivery\s*(?:and\s*Implementation|Timeline|Period|Schedule)?|Installation\s*(?:Period|Timeline|Schedule)|Implementation\s*(?:Period|Timeline|Schedule)|Deployment\s*(?:Timeline|Period)|Completion\s*(?:Time|Schedule|Period)|Execution\s*Period)\s*[:\s-]+\s*([^\n\r]{5,200})',
        r'(?:within|period\s*of)\s*(\d+\s*(?:weeks?|months?|days?)\s*(?:from|after)[^\n\r\.;]{5,100})'
    ],
    ParameterKey.OM: [
        r'(?:Operation\s*(?:&|and)\s*Maintenance|O\s*&\s*M|Warranty\s*Period|Warranty|Maintenance\s*Contract|AMC|CAMC|Defect\s*Liability\s*Period)[:\.\s-]*([^\n\r]{5,300})',
        r'(\d+\s*(?:years?|months?)\s*(?:comprehensive\s*)?(?:on-site\s*)?(?:warranty|O&M|AMC|CAMC|maintenance|Defect\s*Liability)[^\n\r\.;]{0,150})'
    ],
    ParameterKey.SELECTION: [
        r'(?:Selection\s*(?:Methodology|Process)?|Evaluation\s*Criteria|Method\s*of\s*Selection|Bidding\s*Process)[:\.\s-]*([^\n\r]{5,300})',
        r'\b(Least\s*Cost\s*System|L1|QCBS|Quality\s*and\s*Cost\s*Based\s*Selection|Two[\s-]cover\s*system|Two[\s-]envelope\s*system|Single\s*stage\s*two\s*envelope)[^\n\r\.;]{0,150}'
    ],
    ParameterKey.CONSORTIUM: [
        r'\b(?:Consortium|Joint\s*Venture|JV)[:\.\s-]*([^\n\r]{5,300})',
        r'\b(Consortium\s*(?:or|and)?\s*Joint\s*Venture\s*is\s*(?:not\s*allowed|prohibited|permitted|allowed)[^\n\r\.;]{0,150})',
        r'\b(Sub-contracting\s*is\s*(?:not\s*permitted|prohibited|allowed)[^\n\r\.;]{0,150})'
    ],
    ParameterKey.BID_DATES: [
        r'(?:Important\s*Dates|Tender\s*Schedule|Schedule\s*of\s*Events|Critical\s*Dates|Bid\s*Submission\s*(?:Deadline|Closing|End\s*Date)|Closing\s*Date|Opening\s*Date)[:\.\s-]*([^\n\r]{10,400})',
        r'(?:Pre-bid\s*Meeting\s*Date|Technical\s*Bid\s*Opening\s*Date)[:\.\s-]*([^\n\r]{10,200})'
    ],
    ParameterKey.EMD: [
        r'\b(?:Earnest\s*Money\s*Deposit|EMD\s*(?:Amount|Fee)?|Bid\s*Security|Bid\s*Deposit)\b[:\.\s-]*([^\n\r]{3,250})',
        r'\bEMD\b\s*[:\.\s-]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d+)?(?:\s*(?:Lakh|Crore))?[^\n\r\.;]{0,150})'
    ],
    ParameterKey.PERFORMANCE_SECURITY: [
        r'\b(?:Performance\s*Security|Performance\s*Bank\s*Guarantee|PBG|Security\s*Deposit)\b[:\.\s-]*([^\n\r]{3,250})',
        r'(\d+%\s*of\s*(?:contract|tender|order)\s*value[^\n\r\.;]{0,150})'
    ],
    ParameterKey.INDICATIVE_VALUE: [
        r'(?:Estimated\s*(?:Tender|Contract|Procurement|Project)?\s*Value|Estimated\s*Cost|Indicative\s*Value|Tender\s*Value)[:\.\s-]*([^\n\r]{3,200})',
        r'(?:Approximate\s*Value\s*of\s*Work)[:\.\s-]*([^\n\r]{3,200})'
    ]
}

class CandidateExtraction:
    def __init__(self, key: ParameterKey, value: str, page: int, excerpt: str,
                 section: Optional[str] = None, confidence: float = 0.85):
        self.key = key
        self.value = value.strip()
        self.page = page
        self.excerpt = excerpt.strip()
        self.section = section
        self.confidence = confidence

class ExtractionEngine:
    """
    AI & Heuristic extraction engine that scans full documents across all sections,
    extracts the 12 predefined parameters, gathers supporting evidence,
    and isolates candidates for verification.
    """

    def __init__(self):
        self.provider = settings.AI_PROVIDER

    def extract_parameters(self, doc: ParsedDocument) -> Dict[str, ParameterExtraction]:
        candidates_by_param: Dict[ParameterKey, List[CandidateExtraction]] = {
            k: [] for k in ORDERED_PARAMETER_KEYS
        }

        # Scan all pages
        for page in doc.pages:
            self._scan_page_for_parameters(page, candidates_by_param)

        # Consolidate candidates into final ParameterExtraction objects
        results: Dict[str, ParameterExtraction] = {}
        for key in ORDERED_PARAMETER_KEYS:
            candidates = candidates_by_param[key]
            param_obj = self._consolidate_candidates(key, candidates, doc)
            results[key.value] = param_obj

        return results

    def _scan_page_for_parameters(self, page: ParsedPage,
                                  candidates_by_param: Dict[ParameterKey, List[CandidateExtraction]]):
        text = page.text
        if not text:
            return

        lines = text.splitlines()

        # 1. Tender No
        for pat in PARAMETER_PATTERNS[ParameterKey.TENDER_NO]:
            for m in re.finditer(pat, text, re.I):
                val = m.group(1).strip()
                # filter out non-tender noise
                if len(val) >= 4 and not re.match(r'^(page|date|table|section|notice|order)$', val, re.I):
                    excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                    candidates_by_param[ParameterKey.TENDER_NO].append(
                        CandidateExtraction(ParameterKey.TENDER_NO, val, page.page_number, excerpt, "Header/Tender Notice", 0.95)
                    )

        # 2. Authority
        for pat in PARAMETER_PATTERNS[ParameterKey.AUTHORITY]:
            for m in re.finditer(pat, text, re.I):
                val = (m.group(1) if m.groups() else m.group(0)).strip()
                if 4 < len(val) < 120 and not re.search(r'corrigendum|amendment|date\b', val, re.I):
                    excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                    candidates_by_param[ParameterKey.AUTHORITY].append(
                        CandidateExtraction(ParameterKey.AUTHORITY, val, page.page_number, excerpt, "Procuring Authority Clause", 0.90)
                    )

        # 3. Objective
        for pat in PARAMETER_PATTERNS[ParameterKey.OBJECTIVE]:
            for m in re.finditer(pat, text, re.I):
                val = (m.group(1) if m.groups() else m.group(0)).strip()
                if len(val) > 12:
                    excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                    candidates_by_param[ParameterKey.OBJECTIVE].append(
                        CandidateExtraction(ParameterKey.OBJECTIVE, val, page.page_number, excerpt, "Objective/Purpose Clause", 0.88)
                    )

        # 4. Core Scope
        for pat in PARAMETER_PATTERNS[ParameterKey.CORE_SCOPE]:
            for m in re.finditer(pat, text, re.I):
                val = (m.group(1) if m.groups() else m.group(0)).strip()
                if len(val) > 15:
                    excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                    candidates_by_param[ParameterKey.CORE_SCOPE].append(
                        CandidateExtraction(ParameterKey.CORE_SCOPE, val, page.page_number, excerpt, "Scope Clause", 0.85)
                    )

        # 5. Implementation (Delivery / Deployment Timelines)
        for pat in PARAMETER_PATTERNS[ParameterKey.IMPLEMENTATION]:
            for m in re.finditer(pat, text, re.I):
                val = (m.group(1) if m.groups() else m.group(0)).strip()
                val = re.sub(r'[\.;,]+$', '', val).strip()
                if len(val) >= 3 and not val.lower().startswith(('and ', ', ', 'or ')):
                    excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                    candidates_by_param[ParameterKey.IMPLEMENTATION].append(
                        CandidateExtraction(ParameterKey.IMPLEMENTATION, val, page.page_number, excerpt, "Implementation Timeline", 0.90)
                    )

        timeline_direct = re.finditer(r'(\b\d+\s*(?:weeks?|days?|months?)\s*(?:from|after|of)\s*(?:the\s*)?(?:Purchase\s*Order|PO|award|LOA|signing|contract)[^\.\n;]*)', text, re.I)
        for m in timeline_direct:
            val = m.group(1).strip()
            # Ensure it is NOT a performance security, bank guarantee, or EMD deadline
            s_win = max(0, m.start() - 60)
            context_win = text[s_win:m.end()].lower()
            if not re.search(r'performance\s*security|bank\s*guarantee|pbg|emd|bid\s*security|security\s*deposit', context_win):
                excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                candidates_by_param[ParameterKey.IMPLEMENTATION].append(
                    CandidateExtraction(ParameterKey.IMPLEMENTATION, val, page.page_number, excerpt, "Delivery Clause", 0.92)
                )

        # 6. O&M (Warranty / AMC / Maintenance)
        for pat in PARAMETER_PATTERNS[ParameterKey.OM]:
            for m in re.finditer(pat, text, re.I):
                val = (m.group(1) if m.groups() else m.group(0)).strip()
                if len(val) >= 5:
                    excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                    candidates_by_param[ParameterKey.OM].append(
                        CandidateExtraction(ParameterKey.OM, val, page.page_number, excerpt, "O&M/Warranty Clause", 0.88)
                    )

        # 7. Selection (Evaluation & Qualification)
        for pat in PARAMETER_PATTERNS[ParameterKey.SELECTION]:
            for m in re.finditer(pat, text, re.I):
                val = (m.group(1) if m.groups() else m.group(0)).strip()
                if len(val) >= 5:
                    excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                    candidates_by_param[ParameterKey.SELECTION].append(
                        CandidateExtraction(ParameterKey.SELECTION, val, page.page_number, excerpt, "Selection/Evaluation Clause", 0.85)
                    )

        # 8. Consortium / JV
        for pat in PARAMETER_PATTERNS[ParameterKey.CONSORTIUM]:
            for m in re.finditer(pat, text, re.I):
                val = (m.group(1) if m.groups() else m.group(0)).strip()
                if len(val) >= 5:
                    excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                    candidates_by_param[ParameterKey.CONSORTIUM].append(
                        CandidateExtraction(ParameterKey.CONSORTIUM, val, page.page_number, excerpt, "Consortium Clause", 0.90)
                    )

        # 9. Bid Dates
        date_keywords = ['pre-bid', 'submission deadline', 'submission end', 'closing date', 'opening date', 'last date', 'tender schedule']
        for line in lines:
            line_str = line.strip()
            if any(k in line_str.lower() for k in date_keywords):
                dates = extract_dates(line_str)
                if dates or any(k in line_str.lower() for k in ['time', 'hours', 'am', 'pm']):
                    candidates_by_param[ParameterKey.BID_DATES].append(
                        CandidateExtraction(ParameterKey.BID_DATES, line_str, page.page_number, line_str, "Bid Schedule Table/Clause", 0.88)
                    )

        # 10. EMD
        for pat in PARAMETER_PATTERNS[ParameterKey.EMD]:
            for m in re.finditer(pat, text, re.I):
                val = (m.group(1) if m.groups() else m.group(0)).strip()
                # Must not be negative/unrelated
                if re.search(r'exempted|nil|none', val, re.I):
                    excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                    candidates_by_param[ParameterKey.EMD].append(
                        CandidateExtraction(ParameterKey.EMD, "Exempted / Nil", page.page_number, excerpt, "EMD Exemption Clause", 0.90)
                    )
                elif len(val) >= 2 and not re.search(r'directorate|administration|department|authority', val, re.I):
                    excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                    candidates_by_param[ParameterKey.EMD].append(
                        CandidateExtraction(ParameterKey.EMD, val, page.page_number, excerpt, "EMD Clause", 0.92)
                    )

        # 11. Performance Security
        for pat in PARAMETER_PATTERNS[ParameterKey.PERFORMANCE_SECURITY]:
            for m in re.finditer(pat, text, re.I):
                val = (m.group(1) if m.groups() else m.group(0)).strip()
                if len(val) >= 3:
                    excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                    candidates_by_param[ParameterKey.PERFORMANCE_SECURITY].append(
                        CandidateExtraction(ParameterKey.PERFORMANCE_SECURITY, val, page.page_number, excerpt, "Performance Security Clause", 0.90)
                    )

        # 12. Indicative Value (Estimated tender value ONLY)
        for pat in PARAMETER_PATTERNS[ParameterKey.INDICATIVE_VALUE]:
            for m in re.finditer(pat, text, re.I):
                val = (m.group(1) if m.groups() else m.group(0)).strip()
                # Check surrounding text for negative indicator ("has not specified any estimated tender value")
                start_win = max(0, m.start() - 50)
                end_win = min(len(text), m.end() + 50)
                context = text[start_win:end_win].lower()
                
                is_negative = bool(re.search(r'not\s*(?:specified|mentioned|applicable)|no\s*estimated|nil|none', context))
                is_turnover = bool(re.search(r'turnover|bidder|financial bid quotation|maximum price|ceiling unit price', val, re.I))
                
                if not is_negative and not is_turnover:
                    # Must contain a number or currency
                    if re.search(r'[\d₹$]', val):
                        excerpt = self._extract_surrounding_excerpt(text, m.start(), m.end())
                        candidates_by_param[ParameterKey.INDICATIVE_VALUE].append(
                            CandidateExtraction(ParameterKey.INDICATIVE_VALUE, val, page.page_number, excerpt, "Estimated Tender Value Clause", 0.92)
                        )

    def _extract_surrounding_excerpt(self, text: str, start: int, end: int, window: int = 120) -> str:
        s = max(0, start - window)
        e = min(len(text), end + window)
        excerpt = text[s:e].replace("\n", " ").strip()
        excerpt = re.sub(r'\s+', ' ', excerpt)
        return excerpt

    def _consolidate_candidates(self, key: ParameterKey,
                                candidates: List[CandidateExtraction],
                                doc: ParsedDocument) -> ParameterExtraction:
        display_name = PARAMETER_DISPLAY_NAMES[key]

        if not candidates:
            # Em dash for confirmed missing values
            return ParameterExtraction(
                parameter_key=key,
                display_name=display_name,
                extracted_value="—",
                source_pages=[],
                exact_supporting_text="",
                section_or_table=None,
                status=VerificationStatus.MISSING,
                confidence_score=1.0,
                confidence_indicator="High",
                conflict_status=False,
                review_required=False,
                review_reason=f"Parameter '{display_name}' was not found after searching all {doc.page_count} pages."
            )

        unique_candidates: List[CandidateExtraction] = []
        seen = set()
        for c in candidates:
            key_tuple = (c.value.lower(), c.page)
            if key_tuple not in seen:
                seen.add(key_tuple)
                unique_candidates.append(c)

        unique_candidates.sort(key=lambda x: (x.confidence, -x.page), reverse=True)
        primary = unique_candidates[0]
        source_pages = sorted(list(set(c.page for c in unique_candidates)))
        
        extracted_val = primary.value
        supporting_text = primary.excerpt

        # If Bid Dates, combine up to 4 schedule lines
        if key == ParameterKey.BID_DATES and len(unique_candidates) > 1:
            combined_lines = []
            for c in unique_candidates[:4]:
                if c.value not in combined_lines:
                    combined_lines.append(c.value)
            extracted_val = " ; ".join(combined_lines)

        return ParameterExtraction(
            parameter_key=key,
            display_name=display_name,
            extracted_value=extracted_val,
            source_pages=source_pages,
            exact_supporting_text=supporting_text,
            section_or_table=primary.section,
            status=VerificationStatus.NEEDS_REVIEW,
            confidence_score=primary.confidence,
            confidence_indicator="High" if primary.confidence >= 0.85 else ("Medium" if primary.confidence >= 0.6 else "Low"),
            conflict_status=False,
            review_required=False
        )

extraction_engine = ExtractionEngine()
