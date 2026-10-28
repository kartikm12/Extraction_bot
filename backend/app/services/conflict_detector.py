import re
import logging
from typing import List, Dict, Tuple, Optional
from backend.app.models.schemas import (
    ParameterKey, ConflictDetail, ConflictStatement, ParameterExtraction,
    VerificationStatus, PARAMETER_DISPLAY_NAMES
)
from backend.app.services.parser import ParsedDocument, ParsedPage
from backend.app.utils.text_tools import extract_timeline_durations, extract_dates, extract_currency_amounts

logger = logging.getLogger(__name__)

class ConflictDetectionEngine:
    """
    Rigorously detects contradictions, inconsistencies, and supersessions
    across all clauses, tables, annexures, and amendments in a tender document.
    """

    def detect_conflicts(self, doc: ParsedDocument,
                         extractions: Dict[str, ParameterExtraction]) -> Tuple[List[ConflictDetail], Dict[str, ParameterExtraction]]:
        conflicts: List[ConflictDetail] = []
        updated_extractions = dict(extractions)

        # 1. Implementation Timeline Conflict (e.g., 2 weeks vs 3 weeks regression test)
        impl_conflict = self._check_implementation_conflicts(doc)
        if impl_conflict:
            conflicts.append(impl_conflict)
            self._apply_conflict_to_parameter(updated_extractions, ParameterKey.IMPLEMENTATION, impl_conflict)

        # 2. Bid Dates Conflicts (e.g. differing closing / submission deadlines)
        date_conflict = self._check_bid_date_conflicts(doc)
        if date_conflict:
            conflicts.append(date_conflict)
            self._apply_conflict_to_parameter(updated_extractions, ParameterKey.BID_DATES, date_conflict)

        # 3. EMD Amount Conflicts
        emd_conflict = self._check_emd_conflicts(doc)
        if emd_conflict:
            conflicts.append(emd_conflict)
            self._apply_conflict_to_parameter(updated_extractions, ParameterKey.EMD, emd_conflict)

        # 4. O&M / Warranty Conflicts (e.g. 3 years vs 5 years warranty)
        om_conflict = self._check_om_conflicts(doc)
        if om_conflict:
            conflicts.append(om_conflict)
            self._apply_conflict_to_parameter(updated_extractions, ParameterKey.OM, om_conflict)

        # 5. Performance Security Conflicts (e.g. 5% vs 10%)
        ps_conflict = self._check_performance_security_conflicts(doc)
        if ps_conflict:
            conflicts.append(ps_conflict)
            self._apply_conflict_to_parameter(updated_extractions, ParameterKey.PERFORMANCE_SECURITY, ps_conflict)

        # 6. Indicative Tender Value Conflicts
        val_conflict = self._check_indicative_value_conflicts(doc)
        if val_conflict:
            conflicts.append(val_conflict)
            self._apply_conflict_to_parameter(updated_extractions, ParameterKey.INDICATIVE_VALUE, val_conflict)

        return conflicts, updated_extractions

    def _apply_conflict_to_parameter(self, extractions: Dict[str, ParameterExtraction],
                                     key: ParameterKey, conflict: ConflictDetail):
        if key.value in extractions:
            p = extractions[key.value]
            p.conflict_status = True
            p.status = VerificationStatus.CONFLICT
            p.review_required = True
            p.review_reason = conflict.description
            p.conflict_details = [conflict]
            p.confidence_indicator = "Low"
            p.confidence_score = min(p.confidence_score, 0.45)
            
            # Format value to indicate conflicting statements without silently choosing one
            conflict_vals = [f"Page {s.source_page}: \"{s.value}\"" for s in conflict.statements]
            p.extracted_value = f"[CONFLICT - REQUIRES REVIEW] Multiple contradictory values found: " + " VS ".join(conflict_vals)
            
            # Record all conflicting source pages
            for s in conflict.statements:
                if s.source_page not in p.source_pages:
                    p.source_pages.append(s.source_page)
            p.source_pages.sort()

    def _check_implementation_conflicts(self, doc: ParsedDocument) -> Optional[ConflictDetail]:
        """
        Detect conflicting delivery and installation timelines across pages.
        e.g., '2 weeks from Purchase Order' on Page X vs '3 weeks from Purchase Order' on Page Y.
        """
        timeline_statements: List[ConflictStatement] = []
        seen_durations = set()

        for page in doc.pages:
            text = page.text
            if not text:
                continue

            # Look for delivery/installation duration clauses
            patterns = [
                r'((?:delivery|installation|commissioning|implementation|supply)[^\.\n;]{0,60}(?:within|period\s*of)\s*(\d+)\s*(weeks?|days?|months?)[^\.\n;]{0,60}(?:Purchase\s*Order|PO|award|contract)?)',
                r'((?:delivery|installation|commissioning|implementation)[^\.\n;]{0,40}(?:within\s*)?(\d+)\s*(weeks?|days?|months?)\s*(?:from|after)\s*(?:the\s*)?(?:date\s*of\s*)?(?:Purchase\s*Order|PO|award|LOA|signing|contract)[^\.\n;]*)',
                r'((?:delivery|installation)\s*(?:within|period)?\s*[:\s-]*(\d+)\s*(weeks?|days?|months?)[^\.\n;]*)'
            ]

            for pat in patterns:
                for m in re.finditer(pat, text, re.I):
                    full_phrase = m.group(1).strip()
                    # Normalize duration representation e.g. "2 weeks", "3 weeks"
                    num_match = re.search(r'(\d+)\s*(weeks?|days?|months?)', full_phrase, re.I)
                    if num_match:
                        dur_norm = f"{num_match.group(1)} {num_match.group(2).lower()}"
                        # Check context
                        s_idx = max(0, m.start() - 60)
                        e_idx = min(len(text), m.end() + 60)
                        excerpt = text[s_idx:e_idx].replace("\n", " ").strip()
                        
                        stmt = ConflictStatement(
                            value=full_phrase,
                            source_page=page.page_number,
                            source_excerpt=excerpt,
                            section_context=f"Page {page.page_number} Delivery Clause"
                        )
                        # Check if this duration is distinct
                        if dur_norm not in seen_durations:
                            seen_durations.add(dur_norm)
                            timeline_statements.append(stmt)

        # Check for supersession clauses
        supersession = self._detect_supersession(doc, "implementation")

        if len(timeline_statements) > 1:
            desc = (f"Contradictory Implementation timelines detected: "
                    + " vs ".join([f"'{s.value}' (Page {s.source_page})" for s in timeline_statements]))
            
            return ConflictDetail(
                parameter_key=ParameterKey.IMPLEMENTATION,
                parameter_name=PARAMETER_DISPLAY_NAMES[ParameterKey.IMPLEMENTATION],
                description=desc,
                statements=timeline_statements,
                supersession_detected=supersession[0],
                supersession_clause=supersession[1],
                is_resolved=False
            )
        return None

    def _check_bid_date_conflicts(self, doc: ParsedDocument) -> Optional[ConflictDetail]:
        """Detect conflicting bid closing or submission dates across pages."""
        closing_statements: List[ConflictStatement] = []
        seen_dates = set()

        for page in doc.pages:
            text = page.text
            for line in text.splitlines():
                if re.search(r'bid\s*submission\s*(?:closing|deadline|end)|last\s*date\s*of\s*submission', line, re.I):
                    dates = extract_dates(line)
                    for d in dates:
                        if d not in seen_dates:
                            seen_dates.add(d)
                            closing_statements.append(ConflictStatement(
                                value=line.strip(),
                                source_page=page.page_number,
                                source_excerpt=line.strip(),
                                section_context=f"Page {page.page_number} Schedule"
                            ))

        supersession = self._detect_supersession(doc, "schedule")

        if len(seen_dates) > 1:
            desc = (f"Conflicting Bid Submission Dates detected: "
                    + " vs ".join([f"'{s.value}' (Page {s.source_page})" for s in closing_statements]))
            return ConflictDetail(
                parameter_key=ParameterKey.BID_DATES,
                parameter_name=PARAMETER_DISPLAY_NAMES[ParameterKey.BID_DATES],
                description=desc,
                statements=closing_statements,
                supersession_detected=supersession[0],
                supersession_clause=supersession[1],
                is_resolved=False
            )
        return None

    def _check_emd_conflicts(self, doc: ParsedDocument) -> Optional[ConflictDetail]:
        """Detect conflicting EMD amounts specified in different sections."""
        emd_statements: List[ConflictStatement] = []
        seen_amounts = set()

        for page in doc.pages:
            text = page.text
            # Only match actual monetary amounts after EMD / Earnest Money / Bid Security
            matches = re.finditer(r'\b(?:EMD|Earnest\s*Money\s*Deposit|Bid\s*Security)\b\s*(?:amount|schedule)?\s*[:\.\s-]*(?:is\s*)?(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d+)?(?:\s*(?:Lakh|Crore))?)', text, re.I)
            for m in matches:
                amt = m.group(1).strip()
                digits_only = re.sub(r'[^\d]', '', amt)
                if not (len(digits_only) >= 3 or re.search(r'lakh|crore', amt, re.I)):
                    continue
                s_idx = max(0, m.start() - 40)
                e_idx = min(len(text), m.end() + 60)
                surrounding = text[s_idx:e_idx].lower()
                if re.search(r'forfeiture\s*of|refund\s*of', surrounding) and not re.search(r'₹|rs|inr|lakh|crore', m.group(0), re.I):
                    continue

                if amt not in seen_amounts and amt not in ["", "0"]:
                    seen_amounts.add(amt)
                    emd_statements.append(ConflictStatement(
                        value=m.group(0).strip(),
                        source_page=page.page_number,
                        source_excerpt=text[s_idx:e_idx].replace("\n", " ").strip(),
                        section_context=f"Page {page.page_number} EMD"
                    ))

        supersession = self._detect_supersession(doc, "emd")

        if len(seen_amounts) > 1:
            desc = (f"Conflicting EMD amounts detected: "
                    + " vs ".join([f"'{s.value}' (Page {s.source_page})" for s in emd_statements]))
            return ConflictDetail(
                parameter_key=ParameterKey.EMD,
                parameter_name=PARAMETER_DISPLAY_NAMES[ParameterKey.EMD],
                description=desc,
                statements=emd_statements,
                supersession_detected=supersession[0],
                supersession_clause=supersession[1],
                is_resolved=False
            )
        return None

    def _check_om_conflicts(self, doc: ParsedDocument) -> Optional[ConflictDetail]:
        """Detect conflicting warranty or O&M duration clauses (e.g. 3 years vs 5 years)."""
        om_statements: List[ConflictStatement] = []
        seen_warranties = set()

        for page in doc.pages:
            text = page.text
            matches = re.finditer(r'(\b\d+\s*(?:years?|months?)\s*(?:comprehensive\s*)?(?:on-site\s*)?warranty\b)', text, re.I)
            for m in matches:
                raw = m.group(1).lower().strip()
                if raw not in seen_warranties:
                    seen_warranties.add(raw)
                    s_idx = max(0, m.start() - 50)
                    e_idx = min(len(text), m.end() + 50)
                    om_statements.append(ConflictStatement(
                        value=m.group(1).strip(),
                        source_page=page.page_number,
                        source_excerpt=text[s_idx:e_idx].replace("\n", " ").strip(),
                        section_context=f"Page {page.page_number} Warranty"
                    ))

        supersession = self._detect_supersession(doc, "warranty")

        if len(seen_warranties) > 1:
            desc = (f"Conflicting Warranty/O&M periods detected: "
                    + " vs ".join([f"'{s.value}' (Page {s.source_page})" for s in om_statements]))
            return ConflictDetail(
                parameter_key=ParameterKey.OM,
                parameter_name=PARAMETER_DISPLAY_NAMES[ParameterKey.OM],
                description=desc,
                statements=om_statements,
                supersession_detected=supersession[0],
                supersession_clause=supersession[1],
                is_resolved=False
            )
        return None

    def _check_performance_security_conflicts(self, doc: ParsedDocument) -> Optional[ConflictDetail]:
        """Detect conflicting Performance Security percentages (e.g. 5% vs 10%)."""
        ps_statements: List[ConflictStatement] = []
        seen_pcts = set()

        for page in doc.pages:
            text = page.text
            matches = re.finditer(r'(\b\d+%\s*of\s*(?:contract|tender|order)\s*value)', text, re.I)
            for m in matches:
                pct = m.group(1).lower().strip()
                if pct not in seen_pcts:
                    seen_pcts.add(pct)
                    s_idx = max(0, m.start() - 50)
                    e_idx = min(len(text), m.end() + 50)
                    ps_statements.append(ConflictStatement(
                        value=m.group(1).strip(),
                        source_page=page.page_number,
                        source_excerpt=text[s_idx:e_idx].replace("\n", " ").strip(),
                        section_context=f"Page {page.page_number} Performance Security"
                    ))

        supersession = self._detect_supersession(doc, "security")

        if len(seen_pcts) > 1:
            desc = (f"Conflicting Performance Security terms detected: "
                    + " vs ".join([f"'{s.value}' (Page {s.source_page})" for s in ps_statements]))
            return ConflictDetail(
                parameter_key=ParameterKey.PERFORMANCE_SECURITY,
                parameter_name=PARAMETER_DISPLAY_NAMES[ParameterKey.PERFORMANCE_SECURITY],
                description=desc,
                statements=ps_statements,
                supersession_detected=supersession[0],
                supersession_clause=supersession[1],
                is_resolved=False
            )
        return None

    def _check_indicative_value_conflicts(self, doc: ParsedDocument) -> Optional[ConflictDetail]:
        """Detect conflicting estimated tender values."""
        val_statements: List[ConflictStatement] = []
        seen_vals = set()

        for page in doc.pages:
            text = page.text
            matches = re.finditer(r'(?:Estimated\s*(?:Tender|Contract|Procurement)?\s*Value|Estimated\s*Cost)\s*[:\.\s-]*(?:Rs\.?|INR|₹)?\s*([\d,]+(?:\.\d+)?(?:\s*(?:Lakh|Crore))?)', text, re.I)
            for m in matches:
                v = m.group(1).strip()
                if v not in seen_vals:
                    seen_vals.add(v)
                    s_idx = max(0, m.start() - 40)
                    e_idx = min(len(text), m.end() + 60)
                    val_statements.append(ConflictStatement(
                        value=m.group(0).strip(),
                        source_page=page.page_number,
                        source_excerpt=text[s_idx:e_idx].replace("\n", " ").strip(),
                        section_context=f"Page {page.page_number} Tender Value"
                    ))

        supersession = self._detect_supersession(doc, "value")

        if len(seen_vals) > 1:
            desc = (f"Conflicting Estimated Tender Values detected: "
                    + " vs ".join([f"'{s.value}' (Page {s.source_page})" for s in val_statements]))
            return ConflictDetail(
                parameter_key=ParameterKey.INDICATIVE_VALUE,
                parameter_name=PARAMETER_DISPLAY_NAMES[ParameterKey.INDICATIVE_VALUE],
                description=desc,
                statements=val_statements,
                supersession_detected=supersession[0],
                supersession_clause=supersession[1],
                is_resolved=False
            )
        return None

    def _detect_supersession(self, doc: ParsedDocument, topic: str) -> Tuple[bool, Optional[str]]:
        """
        Detects if document explicitly establishes that an amendment, addendum, or corrigendum
        supersedes earlier clauses.
        """
        for page in doc.pages:
            text = page.text
            # Look for supersession statements
            m = re.search(r'(?:this\s*(?:corrigendum|amendment|addendum)\s*supersedes|shall\s*supersede\s*(?:all\s*)?earlier|replaces\s*the\s*clause|revised\s*schedule\s*shall\s*prevail)[^\.\n;]{0,150}', text, re.I)
            if m:
                return True, m.group(0).strip()
        return False, None

conflict_detector = ConflictDetectionEngine()

