from __future__ import annotations

import argparse
import hashlib
import json
import unicodedata
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, NumberObject, TextStringObject
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.pdfgen import canvas


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prellena la memoria PDF de Diputación con propuestas privadas trazables."
    )
    parser.add_argument("--template", required=True, type=Path)
    parser.add_argument("--facts-json", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument("--tenant", required=True)
    parser.add_argument("--allow-proposed-drafts", action="store_true")
    return parser.parse_args()


def digest(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def normalized(value: str) -> str:
    plain = unicodedata.normalize("NFKD", value or "")
    return "".join(char for char in plain if not unicodedata.combining(char)).upper()


def widgets(reader: PdfReader) -> list[dict]:
    found: list[dict] = []
    for page_index, page in enumerate(reader.pages):
        for reference in page.get("/Annots", []):
            annotation = reference.get_object()
            if annotation.get("/Subtype") != "/Widget" or annotation.get("/FT") != "/Tx":
                continue
            found.append({
                "page": page_index,
                "name": str(annotation.get("/T") or ""),
                "tooltip": str(annotation.get("/TU") or annotation.get("/T") or ""),
                "rect": [float(value) for value in annotation["/Rect"]],
            })
    return found


def unique_match(items: list[dict], page: int, token: str) -> dict:
    matches = [item for item in items if item["page"] == page and token in normalized(item["tooltip"])]
    if len(matches) != 1:
        raise ValueError(f"El modelo no contiene un único campo {token} en la página {page + 1}.")
    return matches[0]


def field_map(reader: PdfReader) -> dict[str, dict]:
    items = widgets(reader)
    mapping = {
        "legal_name": unique_match(items, 0, "DENOMINACION COMPLETA"),
        "tax_id": unique_match(items, 0, "NIF"),
        "description": unique_match(items, 0, "FUNDAMENTACIO"),
        "objectives": unique_match(items, 1, "UNDEFINED"),
        "methodology": unique_match(items, 2, "UNDEFINED"),
        "means": unique_match(items, 3, "UNDEFINED"),
    }
    if len(reader.pages) != 5 or len(reader.get_fields() or {}) != 71:
        raise ValueError("La versión del modelo PDF no coincide con el adaptador validado.")
    return mapping


def section(payload: dict, key: str) -> dict:
    item = payload.get("section_proposals", {}).get(key)
    if not item or not item.get("text"):
        raise ValueError(f"Falta la propuesta privada para la sección {key}.")
    return item


def compose(payload: dict, keys: list[str], limit: int = 4_500) -> tuple[str, list[str]]:
    chosen = [section(payload, key) for key in keys]
    text = "\n\n".join(item["text"].strip() for item in chosen)
    text = text.replace("\\(", "(").replace("\\)", ")")
    if len(text) > limit:
        text = text[: limit - 1].rstrip() + "…"
    return text, [item["source"] for item in chosen]


def wrapped_lines(text: str, width: float, font: str, size: int) -> list[str]:
    lines: list[str] = []
    for paragraph in text.splitlines():
        words = paragraph.split()
        current = ""
        for word in words:
            candidate = f"{current} {word}".strip()
            if current and stringWidth(candidate, font, size) > width:
                lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            lines.append(current)
        lines.append("")
    return lines[:-1]


def mark_read_only(page, fields: dict[str, str]) -> None:
    for reference in page.get("/Annots", []):
        annotation = reference.get_object()
        name = str(annotation.get("/T") or "")
        if name not in fields:
            continue
        annotation[NameObject("/V")] = TextStringObject(fields[name])
        annotation[NameObject("/Ff")] = NumberObject(int(annotation.get("/Ff", 0)) | 1)
        annotation[NameObject("/F")] = NumberObject(int(annotation.get("/F", 0)) | 2)


def add_overlay(page, fields: list[tuple[dict, str]], banner_y: float = 24) -> None:
    width = float(page.mediabox.width)
    height = float(page.mediabox.height)
    stream = BytesIO()
    overlay = canvas.Canvas(stream, pagesize=(width, height))
    for field, value in fields:
        x1, y1, x2, y2 = field["rect"]
        size = 9 if y2 - y1 < 30 else 8
        size = min(size, max(5.5, y2 - y1 - 2))
        if y2 - y1 < 30:
            while size > 5.5 and stringWidth(value, "Helvetica", size) > x2 - x1 - 8:
                size -= 0.5
        leading = size + 3
        y = max(y1 + 1, y2 - size - 1)
        for line in wrapped_lines(value, x2 - x1 - 8, "Helvetica", size):
            if y < y1 + 1:
                break
            if line:
                overlay.setFont("Helvetica", size)
                overlay.setFillColorRGB(0.08, 0.08, 0.08)
                overlay.drawString(x1 + 4, y, line)
            y -= leading
    overlay.setFillColorRGB(0.55, 0.18, 0.12)
    overlay.setFont("Helvetica-Bold", 8)
    overlay.drawCentredString(width / 2, banner_y, "BORRADOR - REVISION HUMANA OBLIGATORIA")
    overlay.save()
    stream.seek(0)
    page.merge_page(PdfReader(stream).pages[0])


def main() -> None:
    config = parse_args()
    template = config.template.resolve()
    output = config.out.resolve()
    audit_path = config.audit.resolve()
    if template == output:
        raise ValueError("El borrador no puede sobrescribir el modelo oficial.")

    payload = json.loads(config.facts_json.read_text(encoding="utf-8"))
    payload = payload.get("data") if payload.get("ok") is True else payload
    if payload.get("tenant") != config.tenant:
        raise ValueError("Los hechos no pertenecen al tenant solicitado.")
    facts = payload["institutional_facts"]
    legal_name = facts["legal_name"]
    tax_id = facts["tax_id"]
    if not config.allow_proposed_drafts:
        raise ValueError("Las propuestas solo pueden usarse con --allow-proposed-drafts.")
    if not legal_name.get("value") or not tax_id.get("value"):
        raise ValueError("Faltan razón social o NIF propuestos.")

    description, description_sources = compose(
        payload, ["mission", "trajectory", "territory", "collectives"]
    )
    methodology, methodology_sources = compose(payload, ["methodology", "evaluation"])
    means, means_sources = compose(payload, ["team", "alliances"])
    reader = PdfReader(str(template), strict=False)
    mapping = field_map(reader)
    values = {
        "legal_name": str(legal_name["value"]),
        "tax_id": str(tax_id["value"]),
        "description": description,
        "methodology": methodology,
        "means": means,
    }

    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    for page_index, page in enumerate(writer.pages):
        page_values = {
            mapping[key]["name"]: value
            for key, value in values.items()
            if mapping[key]["page"] == page_index
        }
        mark_read_only(page, page_values)
        add_overlay(page, [
            (mapping[key], value)
            for key, value in values.items()
            if mapping[key]["page"] == page_index
        ])
    writer.set_need_appearances_writer(False)
    writer.add_metadata({
        "/Title": "Memoria de proyecto - borrador privado",
        "/Author": "Insertia local",
        "/Subject": "Prellenado propuesto; revisión humana obligatoria",
    })
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as target:
        writer.write(target)

    filled = [
        {"field": "legal_name", "status": legal_name.get("status"), "evidence": legal_name.get("evidence", [])},
        {"field": "tax_id", "status": tax_id.get("status"), "evidence": tax_id.get("evidence", [])},
        {"field": "description", "status": "proposed", "evidence": description_sources},
        {"field": "methodology", "status": "proposed_with_calendar_gap", "evidence": methodology_sources},
        {"field": "means", "status": "proposed", "evidence": means_sources},
    ]
    audit = {
        "tenant": config.tenant,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "processing": "local_only",
        "external_ai_calls": 0,
        "template_sha256": digest(template),
        "output_sha256": digest(output),
        "template_groups": 7,
        "prefilled_groups": 5,
        "prefilled_percentage": 71,
        "ready_to_present_percentage": 0,
        "filled": filled,
        "personal_values_reused": False,
        "blocked": ["objectives_and_targets", "detailed_budget"],
        "missing_components": ["calendar", "project_specific_objectives", "current_budget"],
        "human_review_required": True,
        "external_submission_allowed": False,
    }
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "output": str(output), "audit": str(audit_path), "prefilled_percentage": 71}, ensure_ascii=False))


if __name__ == "__main__":
    main()
