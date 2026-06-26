from __future__ import annotations

import json
import sqlite3
from pathlib import Path
from typing import Any

from app.core.models import ExtractedDocument, IngestionResult, SourceItem, utcnow


SCHEMA = """
PRAGMA journal_mode=WAL;

CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS source_connections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL,
  config_json TEXT NOT NULL,
  cursor TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE IF NOT EXISTS documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  external_id TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  data_class TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  modified_at TEXT NOT NULL,
  metadata_json TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (tenant_id, source_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_documents_tenant_source ON documents(tenant_id, source_id);
CREATE INDEX IF NOT EXISTS idx_documents_hash ON documents(content_hash);
CREATE INDEX IF NOT EXISTS idx_documents_data_class ON documents(data_class);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  scanned INTEGER NOT NULL,
  inserted INTEGER NOT NULL,
  updated INTEGER NOT NULL,
  skipped INTEGER NOT NULL,
  blocked INTEGER NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT NOT NULL,
  detail_json TEXT NOT NULL,
  created_at TEXT NOT NULL
);
"""


class SQLiteStore:
    def __init__(self, path: Path):
        self.path = path
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def init(self) -> None:
        with self.connect() as connection:
            connection.executescript(SCHEMA)

    def ensure_tenant(self, tenant_id: str, name: str) -> None:
        now = utcnow().isoformat()
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO tenants(id, name, created_at)
                VALUES (?, ?, ?)
                ON CONFLICT(id) DO NOTHING
                """,
                (tenant_id, name, now),
            )

    def upsert_source_connection(
        self,
        *,
        tenant_id: str,
        source_id: str,
        kind: str,
        label: str,
        config: dict[str, Any],
    ) -> None:
        now = utcnow().isoformat()
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO source_connections(id, tenant_id, kind, label, config_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  kind = excluded.kind,
                  label = excluded.label,
                  config_json = excluded.config_json,
                  updated_at = excluded.updated_at
                """,
                (source_id, tenant_id, kind, label, json.dumps(config, ensure_ascii=False), now, now),
            )

    def get_document_hash(self, tenant_id: str, item: SourceItem) -> str | None:
        with self.connect() as connection:
            row = connection.execute(
                """
                SELECT content_hash FROM documents
                WHERE tenant_id = ? AND source_id = ? AND external_id = ?
                """,
                (tenant_id, item.source_id, item.external_id),
            ).fetchone()
            return None if row is None else str(row["content_hash"])

    def upsert_document(self, tenant_id: str, document: ExtractedDocument) -> str:
        item = document.item
        now = utcnow().isoformat()
        previous_hash = self.get_document_hash(tenant_id, item)
        operation = "inserted" if previous_hash is None else "updated"
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO documents(
                  tenant_id, source_id, external_id, name, path, mime_type, data_class,
                  source_kind, content_hash, modified_at, metadata_json, text, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(tenant_id, source_id, external_id) DO UPDATE SET
                  name = excluded.name,
                  path = excluded.path,
                  mime_type = excluded.mime_type,
                  data_class = excluded.data_class,
                  source_kind = excluded.source_kind,
                  content_hash = excluded.content_hash,
                  modified_at = excluded.modified_at,
                  metadata_json = excluded.metadata_json,
                  text = excluded.text,
                  updated_at = excluded.updated_at
                """,
                (
                    tenant_id,
                    item.source_id,
                    item.external_id,
                    item.name,
                    item.path,
                    item.mime_type,
                    item.data_class.value,
                    item.source_kind.value,
                    item.content_hash,
                    item.modified_at.isoformat(),
                    json.dumps(item.metadata, ensure_ascii=False),
                    document.text,
                    now,
                    now,
                ),
            )
        return operation

    def save_ingestion_run(self, tenant_id: str, result: IngestionResult) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO ingestion_runs(
                  id, tenant_id, source_id, scanned, inserted, updated, skipped, blocked, started_at, finished_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    result.run_id,
                    tenant_id,
                    result.source_id,
                    result.scanned,
                    result.inserted,
                    result.updated,
                    result.skipped,
                    result.blocked,
                    result.started_at.isoformat(),
                    result.finished_at.isoformat(),
                ),
            )

    def audit(self, tenant_id: str, actor: str, action: str, target: str, detail: dict[str, Any]) -> None:
        with self.connect() as connection:
            connection.execute(
                """
                INSERT INTO audit_events(tenant_id, actor, action, target, detail_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (tenant_id, actor, action, target, json.dumps(detail, ensure_ascii=False), utcnow().isoformat()),
            )

    def list_documents(self, tenant_id: str) -> list[dict[str, Any]]:
        with self.connect() as connection:
            rows = connection.execute(
                """
                SELECT source_id, external_id, name, path, data_class, source_kind, content_hash, updated_at
                FROM documents
                WHERE tenant_id = ?
                ORDER BY source_id, path
                """,
                (tenant_id,),
            ).fetchall()
            return [dict(row) for row in rows]
