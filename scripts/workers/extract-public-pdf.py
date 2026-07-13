import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

from pypdf import PdfReader


MIN_PAGE_TEXT = 80


def windows_ocr(image_path: str) -> str:
    script = Path(__file__).with_name("ocr-image-windows.ps1")
    completed = subprocess.run(
        ["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(script), image_path],
        check=False,
        capture_output=True,
        text=True,
        encoding="utf-8",
        timeout=90,
    )
    if completed.returncode != 0:
        raise RuntimeError((completed.stderr or "Windows OCR failed").strip()[-1000:])
    return completed.stdout.strip()


def ocr_page(pdf_path: str, page_number: int) -> tuple[str, float | None, str]:
    import pypdfium2 as pdfium

    document = pdfium.PdfDocument(pdf_path)
    image = document[page_number - 1].render(scale=3.5).to_pil()
    try:
        import pytesseract

        if os.getenv("TESSERACT_CMD"):
            pytesseract.pytesseract.tesseract_cmd = os.environ["TESSERACT_CMD"]
        data = pytesseract.image_to_data(image, lang=os.getenv("OCR_LANGUAGES", "spa+cat+eng"), output_type=pytesseract.Output.DICT)
        words = [word.strip() for word in data["text"] if word.strip()]
        confidences = [float(value) for value in data["conf"] if float(value) >= 0]
        return " ".join(words), round(sum(confidences) / len(confidences), 2) if confidences else None, "tesseract"
    except Exception:
        if os.name != "nt":
            raise
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as temporary:
            image_path = temporary.name
        try:
            image.save(image_path, format="PNG")
            return windows_ocr(image_path), None, "windows_native"
        finally:
            Path(image_path).unlink(missing_ok=True)


def extract_page_texts(pdf_path: str) -> tuple[list[str], str]:
    try:
        reader = PdfReader(pdf_path)
        return [page.extract_text() or "" for page in reader.pages], "pdf_text"
    except Exception:
        import pdfplumber

        with pdfplumber.open(pdf_path) as document:
            return [page.extract_text() or "" for page in document.pages], "pdfplumber_text"


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    page_texts, parser = extract_page_texts(sys.argv[1])
    page_evidence = []
    ocr_unavailable = False
    for index, raw_text in enumerate(page_texts, start=1):
        text = raw_text.strip()
        method = parser
        confidence = None
        ocr_error = None
        if len(text) < MIN_PAGE_TEXT:
            try:
                text, confidence, ocr_engine = ocr_page(sys.argv[1], index)
                method = "ocr"
            except Exception as error:
                method = "ocr_unavailable"
                ocr_engine = None
                ocr_error = str(error)[:500]
                ocr_unavailable = True
        else:
            ocr_engine = None
        page_evidence.append({"page": index, "text": text, "method": method, "confidence": confidence, "ocr_engine": ocr_engine, "ocr_error": ocr_error})
    full_text = "\n\n".join(item["text"] for item in page_evidence if item["text"])
    print(json.dumps({
        "page_count": len(page_texts),
        "text": full_text[:120000],
        "page_evidence": page_evidence,
        "ocr_required": any(item["method"].startswith("ocr") for item in page_evidence),
        "ocr_unavailable": ocr_unavailable,
        "parser": parser,
    }, ensure_ascii=False))


if __name__ == "__main__":
    main()
