from __future__ import annotations

import importlib.util
import json
import sqlite3
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
MODULE_PATH = ROOT / "scripts" / "private-corpus" / "query_quarantine_index.py"
spec = importlib.util.spec_from_file_location("query_quarantine_index", MODULE_PATH)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)


def build_index(path: Path) -> None:
    connection = sqlite3.connect(path)
    connection.executescript("""
      CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE chunks (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, source_connection_id TEXT NOT NULL,
        document_id TEXT NOT NULL, source_sha256 TEXT NOT NULL, relative_path TEXT NOT NULL,
        ordinal INTEGER NOT NULL, content TEXT NOT NULL, content_sha256 TEXT NOT NULL UNIQUE,
        data_class TEXT NOT NULL, review_status TEXT NOT NULL, active INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE chunk_search USING fts5(content, content='chunks', content_rowid='rowid');
      CREATE TRIGGER chunks_ai AFTER INSERT ON chunks BEGIN
        INSERT INTO chunk_search(rowid, content) VALUES (new.rowid, new.content);
      END;
    """)
    connection.executemany("INSERT INTO metadata VALUES (?, ?)", [
        ("tenant_id", json.dumps("tenant-a")),
        ("source_connection_id", json.dumps("source-a")),
    ])
    rows = [
        ("chunk-1", "tenant-a", "source-a", "approved-doc", "a" * 64, "memorias/itinerarios.pdf", 2,
         "La entidad desarrolla itinerarios individualizados de inserción laboral.", "b" * 64, "internal", "quarantined", 0, "2026-07-24"),
        ("chunk-2", "tenant-a", "source-a", "other-doc", "c" * 64, "privado/nominas.pdf", 1,
         "Información laboral individual que no está aprobada para esta consulta.", "d" * 64, "internal", "quarantined", 0, "2026-07-24"),
    ]
    connection.executemany("INSERT INTO chunks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", rows)
    connection.commit()
    connection.close()


with tempfile.TemporaryDirectory() as temporary:
    index = Path(temporary) / "quarantine.sqlite3"
    build_index(index)
    result = module.query_index(
        index, "tenant-a", "source-a", "¿Qué experiencia existe en inserción laboral?",
        {"approved-doc"}, 5
    )
    assert result["mode"] == "local_fts_approved_v1"
    assert result["externalAiCalls"] == 0
    assert result["contentStoredRemotely"] is False
    assert len(result["citations"]) == 1
    assert result["citations"][0]["documentId"] == "approved-doc"
    assert "other-doc" not in json.dumps(result)
    try:
        module.query_index(index, "tenant-b", "source-a", "inserción laboral", {"approved-doc"})
        raise AssertionError("La consulta cruzada de tenant no quedó bloqueada")
    except ValueError as error:
        assert "tenant" in str(error)
    try:
        module.approved_ids([], None)
        raise AssertionError("La consulta sin aprobación no quedó bloqueada")
    except ValueError as error:
        assert "aprobado" in str(error)

print(json.dumps({
    "ok": True,
    "mode": "local_fts_approved_v1",
    "tenantIsolation": True,
    "approvalAllowlistRequired": True,
    "externalAiCalls": 0,
}, ensure_ascii=False))
