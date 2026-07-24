from __future__ import annotations

import argparse
import json
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

from pypdf import PdfReader, PdfWriter

from fill_diputacion_memory_pdf import add_overlay, digest, mark_read_only, widgets


FIELD_SPECS = {
    "legal_name": ("AA10[0]", "NOMBRE DE LA ENTIDAD SOLICITANTE"),
    "territory": ("AA1[0]", "AMBITO GEOGRAFICO DE LA ACTUACION"),
    "recent_experience": ("AA8[0]", "PROYECTOS REALIZADOS EN LA COMUNITAT VALENCIANA"),
    "general_experience": ("A170[0]", "PROYECTOS REALIZADOS POR LA ENTIDAD DESDE EL ANO 2010"),
    "insertion_experience": ("A171[0]", "PROYECTOS DE INSERCION SOCIOLABORAL"),
    "collectives": ("BB1[0]", "PERFIL DE LAS PERSONAS A LAS QUE SE VA A DESTINAR"),
    "evaluation": ("H_57[0]", "MECANISMOS DE SEGUIMIENTO"),
}
BLOCKED_GROUPS = [
    "project_name", "member_and_volunteer_counts", "constitution_year", "objectives_and_targets",
    "staffing_tables", "activities", "schedule", "budget", "social_innovation",
    "gender_impact", "declarations", "representative", "signature",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prellena bloques maestros seguros del Anexo GVA.")
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
    if len(reader.pages) != 12 or len(reader.get_fields() or {}) != 347:
        raise ValueError("La versión del Anexo GVA no coincide con el adaptador validado.")
    items = widgets(reader)
    mapping: dict[str, dict] = {}
    for key, (name, token) in FIELD_SPECS.items():
        matches = [item for item in items if item["name"] == name and token in normalized(item["tooltip"])]
        if len(matches) != 1:
            raise ValueError(f"El bloque GVA {key} es ambiguo o no existe.")
        mapping[key] = matches[0]
    return mapping


def proposed(payload: dict, key: str) -> tuple[str, list[str], str]:
    item = payload.get("section_proposals", {}).get(key) or {}
    text = str(item.get("text") or "").strip()
    if not text:
        raise ValueError(f"Falta el hecho maestro {key}.")
    return text, [str(item.get("source") or item.get("document_id") or key)], str(item.get("status") or "proposed")


def main() -> None:
    config = parse_args()
    template = config.template.resolve()
    output = config.out.resolve()
    if template == output:
        raise ValueError("El borrador no puede sobrescribir el modelo oficial.")
    if not config.allow_proposed_drafts:
        raise ValueError("El formulario solo puede generarse como borrador revisable.")
    payload = json.loads(config.facts_json.read_text(encoding="utf-8"))
    payload = payload.get("data") if payload.get("ok") is True else payload
    if payload.get("tenant") != config.tenant:
        raise ValueError("Los hechos no pertenecen al tenant solicitado.")
    legal = payload.get("institutional_facts", {}).get("legal_name") or {}
    legal_name = str(legal.get("value") or "").strip()
    if not legal_name:
        raise ValueError("Falta la razón social del tenant.")
    territory, territory_sources, territory_status = proposed(payload, "territory")
    trajectory, trajectory_sources, trajectory_status = proposed(payload, "trajectory")
    collectives, collective_sources, collective_status = proposed(payload, "collectives")
    evaluation, evaluation_sources, evaluation_status = proposed(payload, "evaluation")
    values = {
        "legal_name": legal_name,
        "territory": territory,
        "recent_experience": trajectory,
        "general_experience": trajectory,
        "insertion_experience": trajectory,
        "collectives": collectives,
        "evaluation": evaluation,
    }
    reader = PdfReader(str(template), strict=False)
    mapping = field_map(reader)
    writer = PdfWriter()
    writer.clone_document_from_reader(reader)
    for page_index, page in enumerate(writer.pages):
        page_values = {mapping[key]["name"]: value for key, value in values.items() if mapping[key]["page"] == page_index}
        mark_read_only(page, page_values)
        add_overlay(
            page,
            [(mapping[key], value) for key, value in values.items() if mapping[key]["page"] == page_index],
            banner_y=float(page.mediabox.height) - 14,
        )
    writer.set_need_appearances_writer(False)
    writer.add_metadata({
        "/Title": "Anexo GVA - borrador privado",
        "/Author": "Insertia local",
        "/Subject": "Siete bloques maestros; revisión humana obligatoria",
    })
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as target:
        writer.write(target)

    sources = {
        "legal_name": legal.get("evidence", []), "territory": territory_sources,
        "recent_experience": trajectory_sources, "general_experience": trajectory_sources,
        "insertion_experience": trajectory_sources, "collectives": collective_sources,
        "evaluation": evaluation_sources,
    }
    statuses = {
        "legal_name": legal.get("status"), "territory": territory_status,
        "recent_experience": trajectory_status, "general_experience": trajectory_status,
        "insertion_experience": trajectory_status, "collectives": collective_status,
        "evaluation": evaluation_status,
    }
    audit = {
        "tenant": config.tenant,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "processing": "local_only", "external_ai_calls": 0,
        "template_sha256": digest(template), "output_sha256": digest(output),
        "template_form_fields": 347, "prefilled_fields": len(values), "prefilled_percentage": 2,
        "reusable_master_groups": 7, "prefilled_master_groups": 7, "safe_master_coverage_percentage": 100,
        "ready_to_present_percentage": 0,
        "personal_values_reused": False,
        "filled": [{"field": key, "status": statuses[key], "evidence": sources[key]} for key in values],
        "blocked": BLOCKED_GROUPS,
        "human_review_required": True, "external_submission_allowed": False,
    }
    config.audit.parent.mkdir(parents=True, exist_ok=True)
    config.audit.write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "output": str(output), "prefilled_master_groups": 7}, ensure_ascii=False))


if __name__ == "__main__":
    main()
