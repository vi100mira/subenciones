from __future__ import annotations

import os
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.connectors.local_folder import LocalFolderConnector
from app.services.ingestion import IngestionService
from app.services.private_knowledge import private_document_path, query_private_knowledge
from app.storage.sqlite import SQLiteStore


DEFAULT_DB = Path(__file__).resolve().parents[1] / "var" / "subvenciones.db"


class LocalIngestionRequest(BaseModel):
    tenant_id: str = "tenant-demo"
    tenant_name: str = "Entidad demo"
    source_id: str = "tenant-demo-local-drive"
    label: str = "Drive simulado entidad demo"
    root: str


class PrivateKnowledgeRequest(BaseModel):
    tenant_id: str
    source_id: str
    question: str


def create_app() -> FastAPI:
    app = FastAPI(title="Subvenciones RAG Backend", version="0.1.0")
    origins = [item.strip() for item in os.getenv(
        "PRIVATE_BRIDGE_ALLOWED_ORIGINS",
        "http://127.0.0.1:3000,http://localhost:3000,https://subvenciones-rag.vercel.app",
    ).split(",") if item.strip()]
    app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET", "POST"],
                       allow_headers=["Authorization", "Content-Type"], allow_credentials=False)
    db_path = Path(os.getenv("SUBVENCIONES_DB", str(DEFAULT_DB)))
    store = SQLiteStore(db_path)
    store.init()

    @app.get("/health")
    def health() -> dict[str, str]:
        return {"status": "ok", "database": str(db_path)}

    @app.get("/tenants/{tenant_id}/documents")
    def list_documents(tenant_id: str) -> list[dict]:
        return store.list_documents(tenant_id)

    @app.post("/private-knowledge/query")
    def private_knowledge_query(payload: PrivateKnowledgeRequest, request: Request) -> dict:
        authorization = request.headers.get("authorization", "")
        token = authorization[7:].strip() if authorization.lower().startswith("bearer ") else ""
        try:
            return {"ok": True, "data": query_private_knowledge(
                token, payload.tenant_id, payload.source_id, payload.question
            )}
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error
        except LookupError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        except (ValueError, FileNotFoundError) as error:
            raise HTTPException(status_code=400, detail=str(error)) from error

    @app.get("/private-documents/{tenant_id}/{source_id}/{document_id}")
    def private_document(tenant_id: str, source_id: str, document_id: str,
                         request: Request) -> FileResponse:
        authorization = request.headers.get("authorization", "")
        token = authorization[7:].strip() if authorization.lower().startswith("bearer ") else ""
        try:
            path, document = private_document_path(token, tenant_id, source_id, document_id)
            return FileResponse(path, media_type=str(document.get("mime_type") or "application/octet-stream"),
                                filename=str(document.get("title") or path.name),
                                content_disposition_type="inline")
        except PermissionError as error:
            raise HTTPException(status_code=403, detail=str(error)) from error
        except LookupError as error:
            raise HTTPException(status_code=409, detail=str(error)) from error
        except (ValueError, FileNotFoundError, json.JSONDecodeError) as error:
            raise HTTPException(status_code=404, detail=str(error)) from error
        except RuntimeError as error:
            raise HTTPException(status_code=503, detail=str(error)) from error

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
