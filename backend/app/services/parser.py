import os
import re
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
import fitz  # PyMuPDF
import docx
from backend.app.config import settings
from backend.app.models.schemas import PageMetadata
from backend.app.services.ocr_engine import ocr_engine
from backend.app.utils.text_tools import normalize_text

logger = logging.getLogger(__name__)

class ParsedPage:
    def __init__(self, page_number: int, text: str, tables: Optional[List[List[List[str]]]] = None,
                 headings: Optional[List[str]] = None, is_scanned: bool = False,
                 ocr_applied: bool = False, ocr_quality: Optional[str] = None,
                 warnings: Optional[List[str]] = None):
        self.page_number = page_number
        self.text = text
        self.tables = tables or []
        self.headings = headings or []
        self.is_scanned = is_scanned
        self.ocr_applied = ocr_applied
        self.ocr_quality = ocr_quality
        self.warnings = warnings or []

class ParsedDocument:
    def __init__(self, filename: str, file_type: str, pages: List[ParsedPage]):
        self.filename = filename
        self.file_type = file_type
        self.pages = pages
        self.page_count = len(pages)
        self.full_text = "\n\n".join([f"--- PAGE {p.page_number} ---\n{p.text}" for p in pages])
        
    def get_page(self, page_number: int) -> Optional[ParsedPage]:
        for p in self.pages:
            if p.page_number == page_number:
                return p
        return None

    def get_pages_meta(self) -> List[PageMetadata]:
        return [
            PageMetadata(
                page_number=p.page_number,
                text_length=len(p.text),
                has_tables=len(p.tables) > 0,
                is_scanned=p.is_scanned,
                ocr_applied=p.ocr_applied,
                ocr_quality=p.ocr_quality,
                warnings=p.warnings
            )
            for p in self.pages
        ]

class DocumentParser:
    """
    Parses PDF and Word tender documents, extracting text, headings,
    and structured tables with page-level mapping and OCR fallback.
    """
    
    @staticmethod
    def parse_document(file_path: Path) -> ParsedDocument:
        ext = file_path.suffix.lower()
        if ext == ".pdf":
            return DocumentParser._parse_pdf(file_path)
        elif ext in [".docx", ".doc"]:
            return DocumentParser._parse_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

    @staticmethod
    def _parse_pdf(file_path: Path) -> ParsedDocument:
        pages: List[ParsedPage] = []
        doc = fitz.open(file_path)
        
        for i, page in enumerate(doc):
            page_num = i + 1
            raw_text = page.get_text("text")
            tables_data = []
            warnings = []
            
            # Extract tables if available
            try:
                tabs = page.find_tables()
                if tabs and tabs.tables:
                    for t in tabs.tables:
                        extracted_table = t.extract()
                        if extracted_table:
                            tables_data.append(extracted_table)
                            # Append table text in readable layout to page text
                            table_str_lines = []
                            for row in extracted_table:
                                clean_row = [str(cell).strip() if cell is not None else "" for cell in row]
                                if any(clean_row):
                                    table_str_lines.append(" | ".join(clean_row))
                            if table_str_lines:
                                raw_text += "\n\n[TABLE DATA]:\n" + "\n".join(table_str_lines)
            except Exception as e:
                logger.warning(f"Error parsing tables on PDF page {page_num}: {e}")

            # Check if page is scanned or low text
            clean_text = normalize_text(raw_text)
            is_scanned = ocr_engine.is_page_scanned(page, min_chars=settings.MIN_TEXT_CHARS_PER_PAGE)
            ocr_applied = False
            ocr_quality = None
            
            if is_scanned:
                ocr_text, ocr_qual, ocr_warn = ocr_engine.ocr_page(page, page_num)
                ocr_applied = True
                ocr_quality = ocr_qual
                if ocr_warn:
                    warnings.append(ocr_warn)
                if ocr_text:
                    clean_text = clean_text + "\n" + normalize_text(ocr_text) if clean_text else normalize_text(ocr_text)

            # Detect headings (lines that are short, title-cased or uppercase)
            headings = []
            for line in clean_text.splitlines():
                line = line.strip()
                if 4 < len(line) < 80 and (line.isupper() or re.match(r'^(?:SECTION|CLAUSE|ANNEXURE|CHAPTER|\d+\.)', line, re.I)):
                    headings.append(line)

            pages.append(ParsedPage(
                page_number=page_num,
                text=clean_text,
                tables=tables_data,
                headings=headings,
                is_scanned=is_scanned,
                ocr_applied=ocr_applied,
                ocr_quality=ocr_quality,
                warnings=warnings
            ))
            
        doc.close()
        return ParsedDocument(filename=file_path.name, file_type="pdf", pages=pages)

    @staticmethod
    def _parse_docx(file_path: Path) -> ParsedDocument:
        """
        Parses Microsoft Word (.docx) documents.
        Emulates pages by paragraph & table clusters or explicit page breaks.
        """
        doc = docx.Document(file_path)
        pages: List[ParsedPage] = []
        
        current_page_num = 1
        current_page_text: List[str] = []
        current_tables: List[List[List[str]]] = []
        current_headings: List[str] = []
        
        # Word documents flow content continuously. We track page breaks and cluster by 40 paragraphs or explicit breaks.
        for para in doc.paragraphs:
            text = para.text.strip()
            # Check for page break
            has_break = False
            for run in para.runs:
                if 'lastRenderedPageBreak' in run._element.xml or 'w:br' in run._element.xml and 'type="page"' in run._element.xml:
                    has_break = True
                    break
                    
            if has_break and current_page_text:
                pages.append(ParsedPage(
                    page_number=current_page_num,
                    text=normalize_text("\n".join(current_page_text)),
                    tables=current_tables,
                    headings=current_headings
                ))
                current_page_num += 1
                current_page_text = []
                current_tables = []
                current_headings = []
                
            if text:
                current_page_text.append(text)
                if para.style.name.startswith("Heading") or (len(text) < 70 and text.isupper()):
                    current_headings.append(text)
                    
            # If paragraph block gets long (> 3000 chars), create a pseudo page
            if sum(len(t) for t in current_page_text) > 3500:
                pages.append(ParsedPage(
                    page_number=current_page_num,
                    text=normalize_text("\n".join(current_page_text)),
                    tables=current_tables,
                    headings=current_headings
                ))
                current_page_num += 1
                current_page_text = []
                current_tables = []
                current_headings = []

        # Parse tables in the docx
        for table in doc.tables:
            table_grid = []
            for row in table.rows:
                row_vals = [cell.text.strip() for cell in row.cells]
                table_grid.append(row_vals)
            if table_grid:
                current_tables.append(table_grid)
                table_str = "\n".join([" | ".join(row) for row in table_grid])
                current_page_text.append(f"\n[TABLE DATA]:\n{table_str}\n")

        if current_page_text:
            pages.append(ParsedPage(
                page_number=current_page_num,
                text=normalize_text("\n".join(current_page_text)),
                tables=current_tables,
                headings=current_headings
            ))
            
        if not pages:
            # Empty document
            pages.append(ParsedPage(page_number=1, text=""))

        return ParsedDocument(filename=file_path.name, file_type="docx", pages=pages)
