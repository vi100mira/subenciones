from __future__ import annotations

import json
import hashlib
import os
import sqlite3
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))
from app.services.private_knowledge import private_document_path, query_private_knowledge


TENANT = "11111111-1111-4111-8111-111111111111"
SOURCE = "22222222-2222-4222-8222-222222222222"
DOCUMENT = "33333333-3333-4333-8333-333333333333"


class Gateway:
    def __init__(self, contracted: bool = True) -> None:
        self.audit_detail = None
        self.audit_action = None
        self.contracted = contracted

    def approved_documents(self, token: str, tenant_id: str, source_id: str):
        assert token == "valid-session"
        assert tenant_id == TENANT and source_id == SOURCE
        return "analyst", {"approved-doc"}

    def require_document_agent(self, tenant_id: str) -> None:
        assert tenant_id == TENANT
        if not self.contracted:
            raise PermissionError("Asistente no incluido en el plan contratado")

    def authorized_document(self, token: str, tenant_id: str, source_id: str, document_id: str):
        assert token == "valid-session" and tenant_id == TENANT and source_id == SOURCE
        assert document_id == DOCUMENT
        return "analyst", {
            "id": DOCUMENT, "external_id": "local-inventory:approved-doc",
            "title": "memoria.pdf", "mime_type": "application/pdf", "data_class": "internal",
            "source_sha256": self.document_sha,
        }

    def audit(self, tenant_id: str, role: str, source_id: str, detail: dict,
              action: str = "private_knowledge.queried") -> None:
        assert tenant_id == TENANT and source_id == SOURCE and role == "analyst"
        self.audit_detail = detail; self.audit_action = action


def build_index(path: Path) -> None:
    path.parent.mkdir(parents=True)
    database = sqlite3.connect(path)
    database.executescript("""
      CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE chunks (
        id TEXT PRIMARY KEY, tenant_id TEXT, source_connection_id TEXT, document_id TEXT,
        source_sha256 TEXT, relative_path TEXT, ordinal INTEGER, content TEXT,
        content_sha256 TEXT UNIQUE, data_class TEXT, review_status TEXT, active INTEGER,
        created_at TEXT
      );
      CREATE VIRTUAL TABLE chunk_search USING fts5(content, content='chunks', content_rowid='rowid');
      CREATE TRIGGER chunks_ai AFTER INSERT ON chunks BEGIN
        INSERT INTO chunk_search(rowid, content) VALUES (new.rowid, new.content);
      END;
    """)
    database.executemany("INSERT INTO metadata VALUES (?, ?)", [
        ("tenant_id", json.dumps(TENANT)), ("source_connection_id", json.dumps(SOURCE)),
    ])
    database.execute("INSERT INTO chunks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (
        "chunk-1", TENANT, SOURCE, "approved-doc", "a" * 64, "proyectos/empleo.pdf", 3,
        "La entidad acredita experiencia en itinerarios de inserción laboral.", "b" * 64,
        "internal", "quarantined", 0, "2026-07-24",
    ))
    database.commit()
    database.close()


with tempfile.TemporaryDirectory() as temporary:
    os.environ["PRIVATE_INDEX_ROOT"] = temporary
    index = Path(temporary) / TENANT / SOURCE / "quarantine.sqlite3"
    build_index(index)
    gateway = Gateway()
    result = query_private_knowledge(
        "valid-session", TENANT, SOURCE, "¿Qué experiencia hay en inserción laboral?", gateway
    )
    assert result["selectedChunkCount"] == 1
    assert result["citations"][0]["title"] == "empleo.pdf"
    assert gateway.audit_detail["external_ai_calls"] == 0
    audit_text = json.dumps(gateway.audit_detail)
    assert "inserción laboral" not in audit_text and "excerpt" not in audit_text
    corpus = Path(temporary) / "corpus"
    corpus.mkdir()
    original = corpus / "proyectos" / "memoria.pdf"
    original.parent.mkdir()
    original.write_bytes(b"%PDF-1.4 private test")
    gateway.document_sha = hashlib.sha256(original.read_bytes()).hexdigest()
    manifest = {
        "tenant_id": TENANT, "source_connection_id": SOURCE, "corpus_root": str(corpus),
        "documents": [{"document_id": "approved-doc", "relative_path": "proyectos/memoria.pdf",
                       "source_sha256": gateway.document_sha, "data_class": "internal"}],
    }
    (index.parent / "source-manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    resolved, document = private_document_path(
        "valid-session", TENANT, SOURCE, DOCUMENT, gateway
    )
    assert resolved == original.resolve() and document["mime_type"] == "application/pdf"
    assert gateway.audit_action == "private_document.opened_local"
    assert "relative_path" not in json.dumps(gateway.audit_detail)
    try:
        query_private_knowledge("", TENANT, SOURCE, "inserción laboral", gateway)
        raise AssertionError("La consulta sin sesión no quedó bloqueada")
    except PermissionError:
        pass
    try:
        query_private_knowledge(
            "valid-session", TENANT, SOURCE, "inserciÃ³n laboral", Gateway(contracted=False)
        )
        raise AssertionError("La consulta IA sin agente documental no quedÃ³ bloqueada")
    except PermissionError:
        pass

print(json.dumps({
    "ok": True, "authenticatedBridge": True, "tenantIsolation": True,
    "approvedDocumentsOnly": True, "documentAgentRequired": True, "auditCopiesContent": False,
    "directLocalPreview": True, "localPathCopiedRemotely": False,
}, ensure_ascii=False))
