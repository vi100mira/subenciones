from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.connectors.local_folder import LocalFolderConnector
from app.storage.sqlite import SQLiteStore
from app.services.ingestion import IngestionService


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest a local folder as a simulated corporate Drive source.")
    parser.add_argument("--tenant-id", default="tenant-demo")
    parser.add_argument("--tenant-name", default="Entidad demo")
    parser.add_argument("--source-id", default="tenant-demo-local-drive")
    parser.add_argument("--label", default="Drive simulado entidad demo")
    parser.add_argument("--root", required=True, help="Folder to ingest")
    parser.add_argument("--db", default=str(ROOT / "var" / "subvenciones.db"))
    parser.add_argument("--list-documents", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    store = SQLiteStore(Path(args.db))
    store.init()
    store.ensure_tenant(args.tenant_id, args.tenant_name)
    store.upsert_source_connection(
        tenant_id=args.tenant_id,
        source_id=args.source_id,
        kind="local_folder",
        label=args.label,
        config={"root": str(Path(args.root).resolve())},
    )

    connector = LocalFolderConnector(args.source_id, Path(args.root))
    result = IngestionService(store).ingest_source(args.tenant_id, connector)
    payload = {
        "run": result.__dict__ | {
            "started_at": result.started_at.isoformat(),
            "finished_at": result.finished_at.isoformat(),
        }
    }
    if args.list_documents:
        payload["documents"] = store.list_documents(args.tenant_id)
    print(json.dumps(payload, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
