import re
import difflib
from typing import Optional, Tuple, List, Dict, Any

def normalize_text(text: str) -> str:
    """Normalize whitespace, unicode dashes, quotes, and non-breaking spaces."""
    if not text:
        return ""
    # Replace non-breaking spaces and other unicode spaces
    text = re.sub(r'[\u00A0\u1680\u180e\u2000-\u200a\u202f\u205f\u3000]', ' ', text)
    # Replace curly quotes and apostrophes
    text = text.replace('“', '"').replace('”', '"').replace('’', "'").replace('‘', "'")
    # Replace en/em dashes with standard hyphen or em dash where appropriate
    text = text.replace('–', '-').replace('—', ' — ')
    # Normalize multiple whitespace to single space
    text = re.sub(r'[ \t]+', ' ', text)
    text = re.sub(r'\r\n|\r', '\n', text)
    return text.strip()

def find_excerpt_in_page(page_text: str, excerpt: str, threshold: float = 0.65) -> Tuple[bool, float, Optional[str]]:
    """
    Verifies if a supporting excerpt exists on the designated page.
    Returns: (is_found, match_score, matched_substring)
    """
    if not page_text or not excerpt:
        return False, 0.0, None
        
    norm_page = normalize_text(page_text).lower()
    norm_excerpt = normalize_text(excerpt).lower()
    
    # 1. Exact match check
    if norm_excerpt in norm_page:
        return True, 1.0, excerpt
        
    # 2. Key phrases / tokens match
    excerpt_words = [w for w in re.split(r'\W+', norm_excerpt) if len(w) > 2]
    if not excerpt_words:
        return False, 0.0, None
        
    found_words = sum(1 for w in excerpt_words if w in norm_page)
    token_score = found_words / len(excerpt_words)
    
    if token_score >= threshold:
        return True, round(token_score, 3), excerpt
        
    # 3. Fuzzy ratio on sliding window
    excerpt_len = len(norm_excerpt)
    if excerpt_len > 15:
        step = max(5, excerpt_len // 4)
        best_ratio = 0.0
        for i in range(0, max(1, len(norm_page) - excerpt_len + 1), step):
            window = norm_page[i:i + excerpt_len + 20]
            ratio = difflib.SequenceMatcher(None, norm_excerpt, window).ratio()
            if ratio > best_ratio:
                best_ratio = ratio
                if best_ratio >= threshold:
                    return True, round(best_ratio, 3), excerpt
                    
        if best_ratio >= threshold:
            return True, round(best_ratio, 3), excerpt

    return False, round(token_score, 3), None

def extract_dates(text: str) -> List[str]:
    """Find date patterns (DD-MM-YYYY, DD/MM/YYYY, DD-Mon-YYYY, DD Month YYYY, etc.)"""
    month_names = r'(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)'
    patterns = [
        # 15-Nov-2026, 15/Nov/2026, 15 Nov 2026
        rf'\b\d{{1,2}}[-/\s\.]{month_names}[-/\s\.,]+\d{{2,4}}\b',
        # Nov 15, 2026
        rf'\b{month_names}[-/\s\.]+\d{{1,2}}(?:st|nd|rd|th)?[-/\s\.,]+\d{{2,4}}\b',
        # 24/11/2026 or 24-11-2026
        r'\b\d{1,2}[-/\.]\d{1,2}[-/\.]\d{2,4}\b',
        # 2026-11-24
        r'\b\d{4}[-/\.]\d{1,2}[-/\.]\d{1,2}\b'
    ]
    dates = []
    for pat in patterns:
        matches = re.findall(pat, text, re.IGNORECASE)
        for m in matches:
            clean_d = m.strip()
            if clean_d not in dates:
                dates.append(clean_d)
    return dates

def extract_currency_amounts(text: str) -> List[Dict[str, Any]]:
    """Extract currency figures like ₹ 5,00,000, Rs. 10 Lakhs, INR 2.5 Crore, etc."""
    pattern = r'(?:(?:Rs\.?|INR|₹|\$|USD)\s*[\d,]+(?:\.\d+)?(?:\s*(?:Lakh|Lakhs|Crore|Crores|Million|Billion|K|Cr|L))?)|(?:\b[\d,]+(?:\.\d+)?\s*(?:Lakh|Lakhs|Crore|Crores)\b)'
    matches = re.finditer(pattern, text, re.IGNORECASE)
    results = []
    for m in matches:
        raw = m.group(0).strip()
        results.append({
            "raw": raw,
            "start": m.start(),
            "end": m.end()
        })
    return results

def extract_timeline_durations(text: str) -> List[Dict[str, Any]]:
    """Extract duration clauses (e.g., '2 weeks', '3 weeks', '30 days', '6 months')"""
    pattern = r'\b(\d+)\s*(days?|weeks?|months?|years?)\b(?:\s*(?:from|after|of)\s+([^\.,;\n]+))?'
    matches = re.finditer(pattern, text, re.IGNORECASE)
    durations = []
    for m in matches:
        durations.append({
            "full_match": m.group(0),
            "amount": int(m.group(1)),
            "unit": m.group(2).lower(),
            "relative_to": m.group(3).strip() if m.group(3) else None
        })
    return durations
