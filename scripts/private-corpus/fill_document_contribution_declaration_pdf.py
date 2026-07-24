from __future__ import annotations

import argparse
import json
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader, PdfWriter

from fill_diputacion_memory_pdf import add_overlay, digest, mark_read_only, widgets


SAFE_FIELDS = {"legal_name": "en representación de", "tax_id": "núm"}
BLOCKED_FIELDS = [
    "representative_identity",
    "representative_tax_id",
    "declared_year",
    "document_declarations",
    "signature",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prellena solo los datos institucionales de una declaración responsable."
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
    text = normalized("\n".join(page.extract_text() or "" for page in reader.pages))
    required = [
        "APORTACION DE DOCUMENTOS",
        "FIRMADA ELECTRONICAMENTE",
    ]
    if len(reader.pages) != 1 or len(fields) != 8 or not all(label in text for label in required):
        raise ValueError("La versión de la declaración no coincide con el adaptador validado.")
    items = widgets(reader)
    mapping: dict[str, dict] = {}
    for key, name in SAFE_FIELDS.items():
        matches = [item for item in items if item["name"] == name]
        if len(matches) != 1:
            raise ValueError(f"El campo institucional {name} es ambiguo o no existe.")
        mapping[key] = matches[0]
    return mapping


def validate_reference(reader: PdfReader, legal_name: str, tax_id: str) -> None:
    fields = reader.get_fields() or {}
    if len(reader.pages) != 1 or len(fields) != 9 or "Signature1" not in fields:
        raise ValueError("La evidencia no es la declaración firmada correspondiente.")
    reference_name = str((fields.get(SAFE_FIELDS["legal_name"]) or {}).get("/V") or "")
    reference_tax_id = str((fields.get(SAFE_FIELDS["tax_id"]) or {}).get("/V") or "")
    if normalized(legal_name) not in normalized(reference_name):
        raise ValueError("La razón social de la evidencia no coincide con el tenant.")
    if normalized(tax_id) != normalized(reference_tax_id):
        raise ValueError("El NIF de la evidencia no coincide con el tenant.")


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
    legal_name = str(facts.get("legal_name", {}).get("value") or "").strip()
    tax_id = str(facts.get("tax_id", {}).get("value") or "").strip()
    if not legal_name or not tax_id:
        raise ValueError("Faltan la razón social o el NIF del tenant.")

    reader = PdfReader(str(template), strict=False)
    mapping = validate_template(reader)
    validate_reference(PdfReader(str(reference), strict=False), legal_name, tax_id)
    values = {"legal_name": legal_name, "tax_id": tax_id}

    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    page = writer.pages[0]
    page_values = {mapping[key]["name"]: value for key, value in values.items()}
    mark_read_only(page, page_values)
    add_overlay(page, [(mapping[key], value) for key, value in values.items()], banner_y=24)
    writer.set_need_appearances_writer(False)
    writer.add_metadata({
        "/Title": "Declaración responsable - borrador privado",
        "/Author": "Insertia local",
        "/Subject": "Solo datos institucionales; revisión humana obligatoria",
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
        "template_text_fields": 5,
        "prefilled_fields": 2,
        "prefilled_percentage": 40,
        "ready_to_present_percentage": 0,
        "personal_values_reused": False,
        "filled": [
            {
                "field": key,
                "status": facts[key].get("status"),
                "evidence": facts[key].get("evidence", []),
            }
            for key in values
        ],
        "blocked": BLOCKED_FIELDS,
        "human_review_required": True,
        "external_submission_allowed": False,
    }
    config.audit.parent.mkdir(parents=True, exist_ok=True)
    config.audit.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "output": str(output), "prefilled_percentage": 40}, ensure_ascii=False))


if __name__ == "__main__":
    main()
