from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from app.connectors.local_folder import LocalFolderConnector
from app.services.ingestion import IngestionService
from app.storage.sqlite import SQLiteStore


DEFAULT_DB = Path(__file__).resolve().parents[1] / "var" / "subvenciones.db"


class LocalIngestionRequest(BaseModel):
    tenant_id: str = "tenant-demo"
    tenant_name: str = "Entidad demo"
    source_id: str = "tenant-demo-local-drive"
    label: str = "Drive simulado entidad demo"
    root: str


def create_app() -> FastAPI:
    app = FastAPI(title="Subvenciones RAG Backend", version="0.1.0")
    db_path = Path(os.getenv("SUBVENCIONES_DB", str(DEFAULT_DB)))
    store = SQLiteStore(db_path)
    store.init()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "database": str(db_path)}

    @app.get("/tenants/{tenant_id}/documents")
    def list_documents(tenant_id: str) -> list[dict]:
        return store.list_documents(tenant_id)

    @app.post("/ingestions/local-folder")
    def ingest_local_folder(payload: LocalIngestionRequest) -> dict:
        root = Path(payload.root).resolve()
        if not root.exists() or not root.is_dir():
            raise HTTPException(status_code=400, detail=f"Folder does not exist: {root}")

        store.ensure_tenant(payload.tenant_id, payload.tenant_name)
        store.upsert_source_connection(
            tenant_id=payload.tenant_id,
            source_id=payload.source_id,
            kind="local_folder",
            label=payload.label,
            config={"root": str(root)},
        )

        connector = LocalFolderConnector(payload.source_id, root)
        result = IngestionService(store).ingest_source(payload.tenant_id, connector)
        return {
            "run_id": result.run_id,
            "source_id": result.source_id,
            "scanned": result.scanned,
            "inserted": result.inserted,
            "updated": result.updated,
            "skipped": result.skipped,
            "blocked": result.blocked,
            "started_at": result.started_at.isoformat(),
            "finished_at": result.finished_at.isoformat(),
        }

    return app


app = create_app()
