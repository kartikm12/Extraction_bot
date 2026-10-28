import logging
from typing import Tuple, Optional
import fitz  # PyMuPDF
from PIL import Image
import io

logger = logging.getLogger(__name__)

class OCREngine:
    """
    Handles OCR fallback for scanned pages and image-only PDF documents.
    Detects low text density and extracts text from embedded images.
    """
    def __init__(self):
        self.rapidocr = None
        self._init_rapidocr()
        
    def _init_rapidocr(self):
        try:
            from rapidocr_onnxruntime import RapidOCR
            self.rapidocr = RapidOCR()
            logger.info("RapidOCR initialized successfully.")
        except Exception as e:
            logger.warning(f"RapidOCR not available: {e}. Fallback OCR mode active.")

    def is_page_scanned(self, page: fitz.Page, min_chars: int = 50) -> bool:
        """
        Determines if a PDF page is scanned / image-only based on text length and image count.
        """
        text = page.get_text().strip()
        if len(text) >= min_chars:
            return False
            
        images = page.get_images()
        # Low text and has images -> scanned
        return len(images) > 0 or len(text) < 10

    def ocr_page(self, page: fitz.Page, page_num: int) -> Tuple[str, str, Optional[str]]:
        """
        Performs OCR on a PDF page.
        Returns: (extracted_text, ocr_quality, warning_message)
        """
        try:
            # Render page to high-res pixmap (DPI ~ 200-300)
            zoom = 2.0  # 144 DPI
            mat = fitz.Matrix(zoom, zoom)
            pix = page.get_pixmap(matrix=mat)
            img_bytes = pix.tobytes("png")
            
            if self.rapidocr:
                results, _ = self.rapidocr(img_bytes)
                if results:
                    lines = [res[1] for res in results if res and len(res) > 1]
                    extracted_text = "\n".join(lines).strip()
                    if len(extracted_text) > 30:
                        return extracted_text, "Good", None
                    else:
                        return extracted_text, "Degraded", f"Page {page_num}: OCR text output is very short ({len(extracted_text)} chars)."
                else:
                    return "", "Failed", f"Page {page_num}: Scanned page with no legible text recognized by OCR."
            else:
                # Fallback: check embedded images or flag for human review
                images = page.get_images()
                if images:
                    return "", "Degraded", f"Page {page_num}: Scanned image detected. Tesseract/RapidOCR offline; human review required."
                return "", "Failed", f"Page {page_num}: Insufficient text on page; requires manual verification."
        except Exception as e:
            logger.error(f"Error during OCR on page {page_num}: {e}")
            return "", "Failed", f"Page {page_num}: OCR error ({str(e)}). Human review required."

ocr_engine = OCREngine()
