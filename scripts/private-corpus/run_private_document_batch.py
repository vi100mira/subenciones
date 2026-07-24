from __future__ import annotations

import argparse
import hashlib
import json
import subprocess
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Genera por lote solo borradores privados con adaptador validado."
    )
    parser.add_argument("--corpus", required=True, type=Path)
    parser.add_argument("--inventory", required=True, type=Path)
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument("--facts-json", type=Path)
    inputs.add_argument("--authorized-context", type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--tenant", required=True)
    parser.add_argument("--allow-proposed-drafts", action="store_true")
    return parser.parse_args()


def digest(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def payload_approved(payload: dict) -> bool:
    facts = payload.get("institutional_facts", {}).values()
    sections = payload.get("section_proposals", {}).values()
    return bool(facts) and all(item.get("status") == "approved" for item in [*facts, *sections])


def authorized_payload(path: Path, tenant: str) -> tuple[dict, str]:
    response = json.loads(path.read_text(encoding="utf-8"))
    payload = response.get("data") if response.get("ok") is True else response
    if not isinstance(payload, dict) or payload.get("tenant") != tenant:
        raise ValueError("El contexto autorizado no pertenece al tenant solicitado.")
    supplied_hash = str(payload.get("context_sha256") or "")
    unsigned = {key: value for key, value in payload.items() if key != "context_sha256"}
    calculated_hash = hashlib.sha256(
        json.dumps(unsigned, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    ).hexdigest()
    authorization = payload.get("authorization", {})
    safe_scope = (
        authorization.get("source_id") and authorization.get("consent_id")
        and authorization.get("read_only") is True
        and authorization.get("external_transfer") is False
        and authorization.get("personal_data_allowed") is False
        and authorization.get("sensitive_data_allowed") is False
    )
    try:
        expires_at = datetime.fromisoformat(
            str(authorization.get("expires_at") or "").replace("Z", "+00:00")
        )
    except ValueError as error:
        raise ValueError("El contexto autorizado no contiene una caducidad válida.") from error
    if not supplied_hash or supplied_hash != calculated_hash or not safe_scope:
        raise ValueError("El contexto autorizado no supera las comprobaciones de integridad y alcance.")
    if expires_at <= datetime.now(timezone.utc):
        raise ValueError("El contexto autorizado ha caducado.")
    if not payload_approved(payload):
        raise ValueError("El contexto autorizado contiene hechos sin aprobar.")
    return payload, supplied_hash


def adapter_for(item: dict) -> tuple[str, str] | None:
    if item["extension"] == ".docx" and item["kind"] == "economic_offer":
        return "economic_offer_docx", ".docx"
    structure = item.get("structure", {})
    blank_official_memory = (
        item["extension"] == ".pdf"
        and item["kind"] == "application_or_memory"
        and structure.get("form_fields") == 71
        and structure.get("empty_form_fields") == 71
    )
    if blank_official_memory:
        return "diputacion_memory_pdf", ".pdf"
    blank_technical_memory = (
        item["extension"] == ".pdf"
        and item["kind"] in {"application_or_memory", "unmapped"}
        and structure.get("pages_sampled") == 2
        and structure.get("form_fields") == 9
        and structure.get("empty_form_fields") == 8
    )
    if blank_technical_memory:
        return "technical_memory_pdf", ".pdf"
    blank_grant_application = (
        item["extension"] == ".pdf"
        and item["kind"] == "application_or_memory"
        and structure.get("pages_sampled") == 4
        and structure.get("form_fields") == 31
        and structure.get("empty_form_fields") == 26
    )
    if blank_grant_application:
        return "grant_application_pdf", ".pdf"
    blank_document_declaration = (
        item["extension"] == ".pdf"
        and item["kind"] == "unmapped"
        and structure.get("pages_sampled") == 1
        and structure.get("form_fields") == 8
        and structure.get("empty_form_fields") == 8
    )
    if blank_document_declaration:
        return "document_contribution_declaration_pdf", ".pdf"
    blank_gva_itinerary = (
        item["extension"] == ".pdf"
        and item["kind"] == "agreement"
        and structure.get("pages_sampled") == 12
        and structure.get("form_fields") == 347
        and structure.get("empty_form_fields") == 335
    )
    if blank_gva_itinerary:
        return "gva_itinerary_form_pdf", ".pdf"
    blank_other_income_declaration = (
        item["extension"] == ".pdf"
        and item["kind"] == "unmapped"
        and structure.get("pages_sampled") == 1
        and structure.get("form_fields") == 38
        and structure.get("empty_form_fields") == 38
    )
    if blank_other_income_declaration:
        return "other_income_declaration_pdf", ".pdf"
    return None


def command_for(
    adapter: str, source: Path, facts: Path, output: Path, audit: Path, tenant: str, allow: bool,
    reference: tuple[Path, str] | None = None,
) -> list[str]:
    script = {
        "economic_offer_docx": SCRIPT_DIR / "fill_docx_skeleton.py",
        "diputacion_memory_pdf": SCRIPT_DIR / "fill_diputacion_memory_pdf.py",
        "technical_memory_pdf": SCRIPT_DIR / "fill_technical_memory_pdf.py",
        "grant_application_pdf": SCRIPT_DIR / "fill_grant_application_pdf.py",
        "document_contribution_declaration_pdf": (
            SCRIPT_DIR / "fill_document_contribution_declaration_pdf.py"
        ),
        "gva_itinerary_form_pdf": SCRIPT_DIR / "fill_gva_itinerary_form_pdf.py",
        "other_income_declaration_pdf": SCRIPT_DIR / "fill_other_income_declaration_pdf.py",
    }[adapter]
    command = [
        sys.executable, str(script), "--template", str(source), "--facts-json", str(facts),
        "--out", str(output), "--audit", str(audit), "--tenant", tenant,
    ]
    if reference:
        command.extend(["--reference", str(reference[0]), "--reference-id", reference[1]])
    if allow:
        command.append("--allow-proposed-drafts")
    return command


def historical_reference(
    documents: list[dict], corpus: Path, template: Path
) -> tuple[Path, str] | None:
    matches: dict[str, tuple[Path, str]] = {}
    for item in documents:
        structure = item.get("structure", {})
        if not (
            item.get("extension") == ".pdf"
            and structure.get("pages_sampled") == 2
            and structure.get("form_fields") == 9
            and structure.get("empty_form_fields", 9) <= 4
        ):
            continue
        candidate = (corpus / item["relative_path"]).resolve()
        if candidate.is_file() and candidate.is_relative_to(template.parent):
            matches[item["source_sha256"]] = (candidate, item["document_id"])
    return next(iter(matches.values())) if len(matches) == 1 else None


def application_reference(
    documents: list[dict], corpus: Path, template: Path
) -> tuple[Path, str] | None:
    matches: dict[str, tuple[Path, str]] = {}
    for item in documents:
        structure = item.get("structure", {})
        if not (
            item.get("extension") == ".pdf"
            and structure.get("pages_sampled") == 4
            and structure.get("form_fields") == 30
            and structure.get("empty_form_fields", 30) <= 3
        ):
            continue
        candidate = (corpus / item["relative_path"]).resolve()
        if candidate.is_file() and candidate.is_relative_to(template.parent):
            matches[item["source_sha256"]] = (candidate, item["document_id"])
    return next(iter(matches.values())) if len(matches) == 1 else None


def declaration_reference(
    documents: list[dict], corpus: Path, template_item: dict
) -> tuple[Path, str] | None:
    project = Path(template_item["relative_path"]).parts[0]
    matches: dict[str, tuple[Path, str]] = {}
    for item in documents:
        structure = item.get("structure", {})
        if not (
            item.get("extension") == ".pdf"
            and Path(item["relative_path"]).parts[0] == project
            and structure.get("pages_sampled") == 1
            and structure.get("form_fields") == 9
            and structure.get("empty_form_fields") == 0
        ):
            continue
        candidate = (corpus / item["relative_path"]).resolve()
        if candidate.is_file():
            matches[item["source_sha256"]] = (candidate, item["document_id"])
    return next(iter(matches.values())) if len(matches) == 1 else None


def run_adapter(command: list[str], output: Path, audit: Path) -> tuple[bool, dict]:
    output.unlink(missing_ok=True)
    audit.unlink(missing_ok=True)
    result = subprocess.run(
        command, capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=120
    )
    if result.returncode or not output.is_file() or not audit.is_file():
        return False, {"return_code": result.returncode}
    return True, json.loads(audit.read_text(encoding="utf-8"))


def main() -> None:
    config = parse_args()
    corpus = config.corpus.resolve()
    output_root = config.out.resolve()
    inventory_path = config.inventory.resolve()
    input_path = (config.authorized_context or config.facts_json).resolve()
    if not corpus.is_dir():
        raise ValueError("El corpus autorizado no existe.")
    if output_root.is_relative_to(corpus):
        raise ValueError("La salida por lote no puede escribirse dentro del corpus fuente.")
    if output_root.exists() and any(output_root.iterdir()):
        raise ValueError("Cada ejecución debe usar una carpeta de salida vacía.")

    inventory = json.loads(inventory_path.read_text(encoding="utf-8"))
    facts = json.loads(input_path.read_text(encoding="utf-8"))
    context_hash = None
    if config.authorized_context:
        facts, context_hash = authorized_payload(input_path, config.tenant)
        if config.allow_proposed_drafts:
            raise ValueError("El contexto autorizado no admite el modo de propuestas de prueba.")
    if inventory.get("tenant") != config.tenant or facts.get("tenant") != config.tenant:
        raise ValueError("Inventario, hechos y ejecución deben pertenecer al mismo tenant.")
    if not config.allow_proposed_drafts and not payload_approved(facts):
        raise ValueError("Hay propuestas sin aprobar; el lote no puede ejecutarse.")

    drafts = output_root / "drafts"
    audits = output_root / "audits"
    drafts.mkdir(parents=True, exist_ok=True)
    audits.mkdir(parents=True, exist_ok=True)
    results: list[dict] = []
    for item in inventory["documents"]:
        if not item.get("candidate"):
            continue
        entry = {
            "document_id": item["document_id"],
            "kind": item["kind"],
            "extension": item["extension"],
        }
        if item["decision"] in {"blocked_sensitive", "manual_only"}:
            results.append({**entry, "status": item["decision"]})
            continue
        adapter_spec = adapter_for(item) if item["decision"] in {"map_before_prefill", "manual_review"} else None
        if not adapter_spec:
            results.append({**entry, "status": "mapping_pending"})
            continue

        source = (corpus / item["relative_path"]).resolve()
        if not source.is_relative_to(corpus) or not source.is_file():
            results.append({**entry, "status": "source_unavailable"})
            continue
        adapter, suffix = adapter_spec
        reference = None
        if adapter == "technical_memory_pdf":
            reference = historical_reference(inventory["documents"], corpus, source)
            if not reference:
                results.append({**entry, "status": "mapping_pending", "adapter": adapter})
                continue
        if adapter == "grant_application_pdf":
            reference = application_reference(inventory["documents"], corpus, source)
            if not reference:
                results.append({**entry, "status": "mapping_pending", "adapter": adapter})
                continue
        if adapter == "document_contribution_declaration_pdf":
            reference = declaration_reference(inventory["documents"], corpus, item)
            if not reference:
                results.append({**entry, "status": "mapping_pending", "adapter": adapter})
                continue
        output = drafts / f"{item['document_id']}-{adapter}{suffix}"
        audit = audits / f"{item['document_id']}-{adapter}.json"
        ok, adapter_audit = run_adapter(
            command_for(
                adapter, source, input_path, output, audit, config.tenant,
                config.allow_proposed_drafts or bool(config.authorized_context), reference,
            ),
            output,
            audit,
        )
        if not ok:
            results.append({**entry, "status": "adapter_rejected", "adapter": adapter, **adapter_audit})
            continue
        results.append({
            **entry,
            "status": "generated",
            "adapter": adapter,
            "output": str(output.relative_to(output_root)),
            "audit": str(audit.relative_to(output_root)),
            "output_sha256": digest(output),
            "prefilled_percentage": adapter_audit.get("prefilled_percentage"),
            "reference_document_id": adapter_audit.get("reference_document_id"),
        })

    status_counts = Counter(item["status"] for item in results)
    manifest = {
        "tenant": config.tenant,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "mode": "persistent_authorized" if config.authorized_context else "proposed_drafts" if config.allow_proposed_drafts else "approved_facts",
        "privacy": {
            "processing": "local_only",
            "external_ai_calls": 0,
            "cross_tenant_reuse": False,
            "private_values_copied_to_manifest": False,
            "human_review_required": True,
            "external_submission_allowed": False,
        },
        "inputs": {
            "inventory_sha256": digest(inventory_path),
            "context_sha256" if config.authorized_context else "facts_sha256": context_hash or digest(input_path),
        },
        "metrics": {"candidates": len(results), "statuses": dict(sorted(status_counts.items()))},
        "documents": results,
    }
    manifest_path = output_root / "batch-manifest.json"
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "manifest": str(manifest_path), **manifest["metrics"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
