from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader, PdfWriter

from fill_diputacion_memory_pdf import add_overlay, digest, mark_read_only, widgets


TEMPLATE_FIELDS = {
    "legal_name": "Cuadro de texto 1_4",
    "project_name": "Cuadro de texto 1",
    "period": "Cuadro de texto 1_2",
    "objectives": "Cuadro de texto 1_3",
    "activities": "Cuadro de texto 1_5",
    "publicity": "Cuadro de texto 1_6",
    "date_day": "Cuadro de texto 2",
    "date_month": "Cuadro de texto 2_2",
    "date_year": "Cuadro de texto 2_3",
}
REFERENCE_FIELDS = {
    "project_name": "Cuadro de texto 1",
    "period": "Cuadro de texto 1_2",
    "objectives": "Cuadro de texto 1_3",
    "activities": "Cuadro de texto 1_5",
    "publicity": "Cuadro de texto 1_6",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Prellena una memoria técnica usando evidencia privada del mismo proyecto."
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


def validate_template(reader: PdfReader) -> dict[str, dict]:
    fields = set((reader.get_fields() or {}).keys())
    page_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    label_sets = [
        {"NOMBRE DE LA ENTIDAD", "NOMBRE DEL PROYECTO", "OBJETIVOS PREVISTOS", "ACTIVIDADES A REALIZAR", "PUBLICIDAD"},
        {"NOM DE L’ENTITAT", "NOM DEL PROJECTE", "OBJECTIUS PREVISTOS", "ACTIVITATS A REALITZAR", "PUBLICITAT"},
    ]
    if len(reader.pages) != 2 or fields != set(TEMPLATE_FIELDS.values()):
        raise ValueError("La versión de la memoria técnica no coincide con el adaptador validado.")
    if not any(all(label in page_text for label in labels) for labels in label_sets):
        raise ValueError("No se reconocen las secciones esperadas de la memoria técnica.")
    items = widgets(reader)
    mapping: dict[str, dict] = {}
    for key, name in TEMPLATE_FIELDS.items():
        matches = [item for item in items if item["name"] == name]
        if len(matches) != 1:
            raise ValueError(f"El campo {name} es ambiguo o no existe.")
        mapping[key] = matches[0]
    return mapping


def reference_values(reader: PdfReader) -> dict[str, str]:
    fields = reader.get_fields() or {}
    page_text = "\n".join(page.extract_text() or "" for page in reader.pages)
    if len(reader.pages) != 2 or "NOMBRE DEL PROYECTO" not in page_text:
        raise ValueError("La evidencia no es la misma memoria técnica cumplimentada.")
    values: dict[str, str] = {}
    for key, name in REFERENCE_FIELDS.items():
        value = str((fields.get(name) or {}).get("/V") or "").strip()
        if not value:
            raise ValueError(f"La evidencia no contiene el dato de proyecto {key}.")
        values[key] = value
    return values


def concise_objectives(value: str) -> str:
    selected: list[str] = []
    for raw in value.replace("\r", "").splitlines():
        line = raw.strip().lstrip("- ")
        if not line or line.lower().startswith("objetivos específicos"):
            continue
        if not (line.lower().startswith("objetivo general") or re.match(r"^OE\d+\.", line)):
            continue
        line = re.split(r"\bCUMPLIMIENTO\b", line, flags=re.IGNORECASE)[0].strip(" :-")
        if len(line) > 90:
            cut = line.rfind(" ", 0, 87)
            line = f"{line[:cut if cut > 0 else 87]}..."
        selected.append(line)
    if not selected:
        raise ValueError("No se han podido separar objetivos reutilizables de la evidencia.")
    return " | ".join(selected)


def concise_activities(value: str) -> str:
    selected: list[str] = []
    for raw in value.replace("\r", "").splitlines():
        line = raw.strip().lstrip("- ")
        if not re.match(r"^OE\d+_?\s*Actividad\s+\d+\.", line, flags=re.IGNORECASE):
            continue
        sentences = re.split(r"(?<=[.!?])\s+", line)
        selected.append(" ".join(sentences[:2]))
    if not selected:
        raise ValueError("No se han podido separar actividades reutilizables de la evidencia.")
    return "\n".join(selected)


def concise_publicity(value: str) -> str:
    selected = [
        line.strip() for line in value.replace("\r", "").splitlines()
        if re.match(r"^[A-Z]\)", line.strip())
    ]
    if not selected:
        raise ValueError("No se han podido separar acciones de publicidad reutilizables.")
    return "\n".join(selected)


def main() -> None:
    config = parse_args()
    template = config.template.resolve()
    reference = config.reference.resolve()
    output = config.out.resolve()
    if template == output or reference == output:
        raise ValueError("El borrador no puede sobrescribir sus documentos fuente.")
    if not config.allow_proposed_drafts:
        raise ValueError("La evidencia histórica solo puede usarse como propuesta revisable.")

    payload = json.loads(config.facts_json.read_text(encoding="utf-8"))
    payload = payload.get("data") if payload.get("ok") is True else payload
    if payload.get("tenant") != config.tenant:
        raise ValueError("Los hechos no pertenecen al tenant solicitado.")
    legal_name = payload.get("institutional_facts", {}).get("legal_name", {})
    if not legal_name.get("value"):
        raise ValueError("Falta la razón social propuesta del tenant.")

    reader = PdfReader(str(template), strict=False)
    mapping = validate_template(reader)
    historic = reference_values(PdfReader(str(reference), strict=False))
    values = {
        "legal_name": str(legal_name["value"]),
        "project_name": historic["project_name"],
        "period": historic["period"],
        "objectives": concise_objectives(historic["objectives"]),
        "activities": concise_activities(historic["activities"]),
        "publicity": concise_publicity(historic["publicity"]),
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
        "/Title": "Memoria técnica - borrador privado",
        "/Author": "Insertia local",
        "/Subject": "Propuesta basada en evidencia histórica; revisión humana obligatoria",
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
        "template_groups": 7,
        "prefilled_groups": 6,
        "prefilled_percentage": 86,
        "ready_to_present_percentage": 0,
        "personal_values_reused": False,
        "filled": [
            {"field": "legal_name", "status": legal_name.get("status"), "evidence": legal_name.get("evidence", [])},
            {"field": "project_name", "status": "proposed_from_historical_document", "evidence": [config.reference_id]},
            {"field": "period", "status": "proposed_from_historical_document", "evidence": [config.reference_id]},
            {"field": "objectives", "status": "proposed_from_historical_document", "evidence": [config.reference_id]},
            {"field": "activities", "status": "proposed_from_historical_document", "evidence": [config.reference_id]},
            {"field": "publicity", "status": "proposed_from_historical_document", "evidence": [config.reference_id]},
        ],
        "blocked": ["date", "representatives", "signatures"],
        "human_review_required": True,
        "external_submission_allowed": False,
    }
    config.audit.parent.mkdir(parents=True, exist_ok=True)
    config.audit.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "output": str(output), "prefilled_percentage": 86}, ensure_ascii=False))


if __name__ == "__main__":
    main()
