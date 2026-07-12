import json
import os
import sys

import pytesseract
import pypdfium2 as pdfium
from pypdf import PdfReader


MIN_PAGE_TEXT = 80


def ocr_page(pdf_path: str, page_number: int) -> tuple[str, float | None]:
    document = pdfium.PdfDocument(pdf_path)
    image = document[page_number - 1].render(scale=3.5).to_pil()
    data = pytesseract.image_to_data(image, lang=os.getenv("OCR_LANGUAGES", "spa+cat+eng"), output_type=pytesseract.Output.DICT)
    words = [word.strip() for word in data["text"] if word.strip()]
    confidences = [float(value) for value in data["conf"] if float(value) >= 0]
    return " ".join(words), round(sum(confidences) / len(confidences), 2) if confidences else None


def main() -> None:
    if os.getenv("TESSERACT_CMD"):
        pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]
    reader = PdfReader(sys.argv[1])
    page_evidence = []
    ocr_unavailable = False
    for index, page in enumerate(reader.pages, start=1):
        text = (page.extract_text() or "").strip()
        method = "pdf_text"
        confidence = None
        if len(text) < MIN_PAGE_TEXT:
            try:
                text, confidence = ocr_page(sys.argv[1], index)
                method = "ocr"
            except (pytesseract.TesseractNotFoundError, pytesseract.TesseractError, FileNotFoundError):
                method = "ocr_unavailable"
                ocr_unavailable = True
        page_evidence.append({"page": index, "text": text, "method": method, "confidence": confidence})
    full_text = "\n\n".join(item["text"] for item in page_evidence if item["text"])
    print(json.dumps({
        "page_count": len(reader.pages),
        "text": full_text[:120000],
        "page_evidence": page_evidence,
        "ocr_required": any(item["method"] != "pdf_text" for item in page_evidence),
        "ocr_unavailable": ocr_unavailable,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
