from __future__ import annotations

import argparse
import json
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader, PdfWriter

from fill_diputacion_memory_pdf import add_overlay, digest, mark_read_only, widgets


SAFE_FIELDS = {
    "call_year": "Cuadro de texto 1",
    "purpose": "Cuadro de texto 3",
    "requested_amount": "Cuadro de texto 4",
    "legal_name": "Cuadro de texto 6",
    "tax_id": "Cuadro de texto 7",
    "registered_address": "Cuadro de texto 8",
    "postal_code": "Cuadro de texto 9",
    "municipality": "Cuadro de texto 10",
    "notification_address": "Cuadro de texto 21",
    "notification_postal_code": "Cuadro de texto 22",
    "notification_municipality": "Cuadro de texto 23",
}
BLOCKED_FIELDS = [
    "phones", "emails", "representative_identity", "representative_tax_id",
    "bank_account", "opposition", "declarations", "consent", "date", "signature",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prellena una solicitud oficial con datos institucionales del mismo expediente."
    )
    parser.add_argument("--template", required=True, type=Path)
    parser.add_argument("--reference", required=True, type=Path)
    parser.add_argument("--reference-id", required=True)
    parser.add_argument("--facts-json", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument("--tenant", required=True)
    parser.add_argument("--allow-proposed-drafts", action="store_true")
    return parser.parse_args()


def normalized(value: str) -> str:
    plain = unicodedata.normalize("NFKD", value or "")
    return "".join(char for char in plain if not unicodedata.combining(char)).upper()


def validate_template(reader: PdfReader) -> dict[str, dict]:
    fields = reader.get_fields() or {}
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    labels = ["DADES SUBVENCIÓ", "DADES DEL SOL·LICITANT", "DADES BANCARIES", "SIGNATURA"]
    if len(reader.pages) != 4 or len(fields) != 31 or not all(label in text for label in labels):
        raise ValueError("La versión de la solicitud no coincide con el adaptador validado.")
    items = widgets(reader)
    mapping: dict[str, dict] = {}
    for key, name in SAFE_FIELDS.items():
        matches = [item for item in items if item["name"] == name]
        if len(matches) != 1:
            raise ValueError(f"El campo institucional {name} es ambiguo o no existe.")
        mapping[key] = matches[0]
    return mapping


def safe_reference_values(reader: PdfReader) -> dict[str, str]:
    fields = reader.get_fields() or {}
    text = "\n".join(page.extract_text() or "" for page in reader.pages)
    if len(reader.pages) != 4 or "SOLICITUD DE SUBVENCION" not in normalized(text):
        raise ValueError("La evidencia no es la misma solicitud cumplimentada.")
    values: dict[str, str] = {}
    for key, name in SAFE_FIELDS.items():
        value = str((fields.get(name) or {}).get("/V") or "").strip()
        if not value:
            raise ValueError(f"La evidencia no contiene el campo institucional {key}.")
        values[key] = value
    return values


def main() -> None:
    config = parse_args()
    template = config.template.resolve()
    reference = config.reference.resolve()
    output = config.out.resolve()
    if output in {template, reference}:
        raise ValueError("El borrador no puede sobrescribir sus documentos fuente.")
    if not config.allow_proposed_drafts:
        raise ValueError("La evidencia privada solo puede usarse como propuesta revisable.")

    payload = json.loads(config.facts_json.read_text(encoding="utf-8"))
    payload = payload.get("data") if payload.get("ok") is True else payload
    if payload.get("tenant") != config.tenant:
        raise ValueError("Los hechos no pertenecen al tenant solicitado.")
    facts = payload.get("institutional_facts", {})
    legal_name = str(facts.get("legal_name", {}).get("value") or "")
    tax_id = str(facts.get("tax_id", {}).get("value") or "")
    if not legal_name or not tax_id:
        raise ValueError("Faltan la razón social o el NIF del tenant.")

    reader = PdfReader(str(template), strict=False)
    mapping = validate_template(reader)
    values = safe_reference_values(PdfReader(str(reference), strict=False))
    if normalized(legal_name) not in normalized(values["legal_name"]):
        raise ValueError("La razón social de la evidencia no coincide con el tenant.")
    if normalized(tax_id) != normalized(values["tax_id"]):
        raise ValueError("El NIF de la evidencia no coincide con el tenant.")

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
        ], banner_y=float(page.mediabox.height) - 14)
    writer.set_need_appearances_writer(False)
    writer.add_metadata({
        "/Title": "Solicitud de subvención - borrador privado",
        "/Author": "Insertia local",
        "/Subject": "Prellenado institucional; revisión humana obligatoria",
    })
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as target:
        writer.write(target)

    audit = {
        "tenant": config.tenant,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "processing": "local_only",
        "external_ai_calls": 0,
        "template_sha256": digest(template),
        "reference_document_id": config.reference_id,
        "reference_sha256": digest(reference),
        "output_sha256": digest(output),
        "template_fillable_fields": 26,
        "prefilled_fields": len(values),
        "prefilled_percentage": 42,
        "ready_to_present_percentage": 0,
        "personal_values_reused": False,
        "filled": [
            {"field": key, "status": "proposed_from_same_application", "evidence": [config.reference_id]}
            for key in values
        ],
        "blocked": BLOCKED_FIELDS,
        "human_review_required": True,
        "external_submission_allowed": False,
    }
    config.audit.parent.mkdir(parents=True, exist_ok=True)
    config.audit.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "output": str(output), "prefilled_percentage": 42}, ensure_ascii=False))


if __name__ == "__main__":
    main()
