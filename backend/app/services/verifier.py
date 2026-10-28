import re
import logging
from typing import Dict, List, Tuple
from backend.app.models.schemas import (
    ParameterKey, ParameterExtraction, VerificationStatus,
    ConflictDetail
)
from backend.app.services.parser import ParsedDocument
from backend.app.services.conflict_detector import conflict_detector
from backend.app.utils.text_tools import find_excerpt_in_page, extract_dates, extract_currency_amounts

logger = logging.getLogger(__name__)

class EvidenceVerificationEngine:
    """
    Validates every extracted parameter against original document evidence,
    confirms page citations, validates numerical/date formats, and calibrates confidence.
    """

    def verify_all(self, doc: ParsedDocument,
                   extractions: Dict[str, ParameterExtraction]) -> Tuple[Dict[str, ParameterExtraction], List[ConflictDetail]]:
        
        # 1. First run the conflict detection engine
        conflicts, updated_extractions = conflict_detector.detect_conflicts(doc, extractions)

        # 2. Verify each parameter individually
        for key_str, param in updated_extractions.items():
            self._verify_parameter(doc, param)

        return updated_extractions, conflicts

    def _verify_parameter(self, doc: ParsedDocument, param: ParameterExtraction):
        # Case 1: Missing value
        if param.extracted_value == "—" or not param.extracted_value:
            param.extracted_value = "—"
            param.status = VerificationStatus.MISSING
            param.confidence_score = 1.0
            param.confidence_indicator = "High"
            param.review_required = False
            return

        # Case 2: Already flagged as conflict by conflict engine
        if param.conflict_status:
            param.status = VerificationStatus.CONFLICT
            param.review_required = True
            param.confidence_indicator = "Low"
            param.confidence_score = 0.35
            return

        # Case 3: Verify evidence on cited pages
        if not param.source_pages:
            param.status = VerificationStatus.NEEDS_REVIEW
            param.review_required = True
            param.review_reason = "No source page cited for extracted parameter."
            param.confidence_indicator = "Low"
            param.confidence_score = 0.40
            return

        # Check OCR warnings on cited pages
        for p_num in param.source_pages:
            page_obj = doc.get_page(p_num)
            if page_obj:
                if page_obj.ocr_quality in ["Degraded", "Failed"]:
                    param.ocr_warning = f"Page {p_num} has degraded OCR quality ({page_obj.ocr_quality})."
                    param.status = VerificationStatus.NEEDS_REVIEW
                    param.review_required = True
                    param.review_reason = param.ocr_warning
                    param.confidence_indicator = "Low"
                    param.confidence_score = min(param.confidence_score, 0.50)
                    return

        # Check excerpt presence in page text
        page_verified = False
        best_match_score = 0.0
        
        for p_num in param.source_pages:
            page_obj = doc.get_page(p_num)
            if not page_obj:
                continue
            
            # Match either supporting excerpt or the extracted value itself
            found_excerpt, score_e, _ = find_excerpt_in_page(page_obj.text, param.exact_supporting_text)
            found_val, score_v, _ = find_excerpt_in_page(page_obj.text, param.extracted_value)
            
            score = max(score_e, score_v)
            if score > best_match_score:
                best_match_score = score
                
            if found_excerpt or found_val or score >= 0.65:
                page_verified = True
                break

        if not page_verified:
            param.status = VerificationStatus.NEEDS_REVIEW
            param.review_required = True
            param.review_reason = f"Supporting text could not be verified on cited page(s) {param.source_pages} (match score: {best_match_score})."
            param.confidence_indicator = "Low"
            param.confidence_score = max(0.2, best_match_score * 0.6)
            return

        # 4. Domain & Format Specific Checks
        self._validate_parameter_formats(param)

        # If everything passes verification and no conflicts:
        if not param.review_required and not param.conflict_status:
            param.status = VerificationStatus.VERIFIED
            param.confidence_score = max(0.85, round(best_match_score, 2))
            param.confidence_indicator = "High"

    def _validate_parameter_formats(self, param: ParameterExtraction):
        val = param.extracted_value

        if param.parameter_key == ParameterKey.BID_DATES:
            # Must contain at least one valid date pattern or clear schedule
            dates = extract_dates(val)
            if not dates and not any(k in val.lower() for k in ['corrigendum', 'schedule', 'am', 'pm', 'date']):
                param.status = VerificationStatus.NEEDS_REVIEW
                param.review_required = True
                param.review_reason = "Date pattern unverified in extracted Bid Dates."
                param.confidence_indicator = "Medium"
                param.confidence_score = 0.60

        elif param.parameter_key == ParameterKey.EMD:
            # Check for currency or 'exempt'
            has_cur = bool(re.search(r'₹|Rs|INR|\$|Lakh|Crore|nil|exempt', val, re.I))
            if not has_cur and not re.search(r'\d+', val):
                param.status = VerificationStatus.NEEDS_REVIEW
                param.review_required = True
                param.review_reason = "EMD amount format is ambiguous (no currency or numerical value found)."
                param.confidence_indicator = "Medium"
                param.confidence_score = 0.55

        elif param.parameter_key == ParameterKey.PERFORMANCE_SECURITY:
            # Check for percentage or amount
            has_pct = bool(re.search(r'\d+%', val))
            has_cur = bool(re.search(r'₹|Rs|INR|\$|Lakh|Crore', val, re.I))
            if not has_pct and not has_cur:
                param.status = VerificationStatus.NEEDS_REVIEW
                param.review_required = True
                param.review_reason = "Performance security percentage or amount is unverified."
                param.confidence_indicator = "Medium"
                param.confidence_score = 0.60

        elif param.parameter_key == ParameterKey.INDICATIVE_VALUE:
            # Ensure it is not mistaken for general turnover or random bid price
            if re.search(r'turnover|quoted price|bid price|minimum turnover', val, re.I):
                param.status = VerificationStatus.NEEDS_REVIEW
                param.review_required = True
                param.review_reason = "Financial clause may refer to bidder turnover or price rather than estimated tender value."
                param.confidence_indicator = "Low"
                param.confidence_score = 0.40

evidence_verifier = EvidenceVerificationEngine()

