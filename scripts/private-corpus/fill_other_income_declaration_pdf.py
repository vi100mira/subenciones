from __future__ import annotations

import argparse
import json
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader, PdfWriter

from fill_diputacion_memory_pdf import add_overlay, digest, mark_read_only, widgets


SAFE_FIELDS = {"legal_name": "Texto2", "tax_id": "Texto3"}
BLOCKED_FIELDS = [
    "representative_identity", "representative_tax_id", "project_total", "tax_base", "vat",
    "other_income_decision", "income_sources", "income_amounts", "total_income", "date", "signature",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prellena solo datos institucionales en la declaración de otros ingresos."
    )
    parser.add_argument("--template", required=True, type=Path)
    parser.add_argument("--facts-json", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--audit", required=True, type=Path)
    parser.add_argument("--tenant", required=True)
    parser.add_argument("--allow-proposed-drafts", action="store_true")
    return parser.parse_args()


def normalized(value: str) -> str:
    plain = unicodedata.normalize("NFKD", value or "")
    return "".join(char for char in plain if not unicodedata.combining(char)).upper()


def field_map(reader: PdfReader) -> dict[str, dict]:
    text = normalized("\n".join(page.extract_text() or "" for page in reader.pages))
    if len(reader.pages) != 1 or len(reader.get_fields() or {}) != 38:
        raise ValueError("La versión de la declaración de ingresos no coincide con el adaptador.")
    if "COSTE TOTAL DEL PROYECTO" not in text or "OTROS INGRESOS" not in text:
        raise ValueError("No se reconoce la declaración de otros ingresos.")
    items = widgets(reader)
    mapping: dict[str, dict] = {}
    for key, name in SAFE_FIELDS.items():
        matches = [item for item in items if item["name"] == name]
        if len(matches) != 1:
            raise ValueError(f"El campo institucional {name} es ambiguo o no existe.")
        mapping[key] = matches[0]
    return mapping


def main() -> None:
    config = parse_args()
    template = config.template.resolve()
    output = config.out.resolve()
    if template == output:
        raise ValueError("El borrador no puede sobrescribir el modelo oficial.")
    if not config.allow_proposed_drafts:
        raise ValueError("La declaración solo puede generarse como borrador revisable.")
    payload = json.loads(config.facts_json.read_text(encoding="utf-8"))
    payload = payload.get("data") if payload.get("ok") is True else payload
    if payload.get("tenant") != config.tenant:
        raise ValueError("Los hechos no pertenecen al tenant solicitado.")
    facts = payload.get("institutional_facts", {})
    values = {
        key: str(facts.get(key, {}).get("value") or "").strip()
        for key in SAFE_FIELDS
    }
    if not all(values.values()):
        raise ValueError("Faltan la razón social o el NIF del tenant.")
    reader = PdfReader(str(template), strict=False)
    mapping = field_map(reader)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    page = writer.pages[0]
    mark_read_only(page, {mapping[key]["name"]: value for key, value in values.items()})
    add_overlay(
        page, [(mapping[key], value) for key, value in values.items()],
        banner_y=float(page.mediabox.height) - 14,
    )
    writer.set_need_appearances_writer(False)
    writer.add_metadata({
        "/Title": "Declaración de otros ingresos - borrador privado",
        "/Author": "Insertia local",
        "/Subject": "Solo razón social y NIF; revisión humana obligatoria",
    })
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as target:
        writer.write(target)

    audit = {
        "tenant": config.tenant, "created_at": datetime.now(timezone.utc).isoformat(),
        "processing": "local_only", "external_ai_calls": 0,
        "template_sha256": digest(template), "output_sha256": digest(output),
        "template_text_fields": 36, "prefilled_fields": 2, "prefilled_percentage": 6,
        "reusable_master_groups": 2, "prefilled_master_groups": 2, "safe_master_coverage_percentage": 100,
        "ready_to_present_percentage": 0, "personal_values_reused": False,
        "filled": [{"field": key, "status": facts[key].get("status"), "evidence": facts[key].get("evidence", [])} for key in values],
        "blocked": BLOCKED_FIELDS, "human_review_required": True, "external_submission_allowed": False,
    }
    config.audit.parent.mkdir(parents=True, exist_ok=True)
    config.audit.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "output": str(output), "prefilled_master_groups": 2}, ensure_ascii=False))


if __name__ == "__main__":
    main()
