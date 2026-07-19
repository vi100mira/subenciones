from __future__ import annotations

import argparse
import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Elimina un lote documental privado y conserva un recibo sin contenido."
    )
    parser.add_argument("--tenant-root", required=True, type=Path)
    parser.add_argument("--run", required=True, type=Path)
    parser.add_argument("--tenant", required=True)
    parser.add_argument("--confirm-delete", required=True)
    parser.add_argument("--receipt", required=True, type=Path)
    parser.add_argument("--apply", action="store_true")
    return parser.parse_args()


def digest(path: Path) -> str:
    result = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            result.update(block)
    return result.hexdigest()


def main() -> None:
    config = parse_args()
    root = config.tenant_root.resolve()
    run = config.run.resolve()
    receipt = config.receipt.resolve()
    if config.confirm_delete != config.tenant:
        raise ValueError("La confirmación no coincide con el tenant.")
    if not root.is_dir() or not run.is_dir() or run == root or not run.is_relative_to(root):
        raise ValueError("El lote debe estar dentro de la raíz privada del tenant.")
    if receipt.is_relative_to(run) or not receipt.is_relative_to(root):
        raise ValueError("El recibo debe quedar fuera del lote y dentro de la raíz del tenant.")
    if receipt.exists():
        raise ValueError("El recibo de borrado ya existe.")
    if run.is_symlink() or any(path.is_symlink() for path in run.rglob("*")):
        raise ValueError("No se eliminan lotes que contengan enlaces simbólicos.")

    manifest_path = run / "batch-manifest.json"
    if not manifest_path.is_file():
        raise ValueError("El lote no contiene un manifiesto verificable.")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("tenant") != config.tenant:
        raise ValueError("El manifiesto no pertenece al tenant confirmado.")
    privacy = manifest.get("privacy", {})
    if privacy.get("private_values_copied_to_manifest") is not False:
        raise ValueError("El manifiesto no acredita que excluye valores privados.")

    files = [path for path in run.rglob("*") if path.is_file()]
    output_hashes = sorted(
        str(item.get("output_sha256")) for item in manifest.get("documents", [])
        if item.get("status") == "generated" and item.get("output_sha256")
    )
    summary = {
        "tenant": config.tenant,
        "run_name": run.name,
        "manifest_sha256": digest(manifest_path),
        "generated_output_sha256": output_hashes,
        "deleted_file_count": len(files),
        "deleted_bytes": sum(path.stat().st_size for path in files),
        "content_copied_to_receipt": False,
    }
    if not config.apply:
        print(json.dumps({"ok": True, "mode": "dry_run", **summary}, ensure_ascii=False))
        return

    shutil.rmtree(run)
    receipt.parent.mkdir(parents=True, exist_ok=True)
    receipt.write_text(json.dumps({
        "status": "deleted",
        "deleted_at": datetime.now(timezone.utc).isoformat(),
        **summary,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"ok": True, "mode": "applied", "receipt": str(receipt)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
