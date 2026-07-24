from __future__ import annotations

import argparse
import hashlib
import json
import os
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

from build_master_draft import PLACEHOLDER, extract, paragraphs, privacy_blocked


ELIGIBLE_DECISIONS = {"reference_only", "reference_only_filled", "map_before_prefill", "manual_review"}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepara un índice local privado en cuarentena, sin IA externa.")
    parser.add_argument("--corpus", required=True, type=Path)
    parser.add_argument("--inventory", required=True, type=Path)
    parser.add_argument("--out", required=True, type=Path)
    parser.add_argument("--tenant", required=True)
    parser.add_argument("--source-id", required=True)
    return parser.parse_args()


def file_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for block in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def prepare_database(target: Path) -> sqlite3.Connection:
    temporary = target.with_suffix(".tmp")
    temporary.unlink(missing_ok=True)
    connection = sqlite3.connect(temporary)
    connection.executescript("""
      PRAGMA journal_mode=DELETE;
      CREATE TABLE metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
      CREATE TABLE chunks (
        id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL, source_connection_id TEXT NOT NULL,
        document_id TEXT NOT NULL, source_sha256 TEXT NOT NULL, relative_path TEXT NOT NULL,
        ordinal INTEGER NOT NULL, content TEXT NOT NULL, content_sha256 TEXT NOT NULL UNIQUE,
        data_class TEXT NOT NULL CHECK(data_class = 'internal'),
        review_status TEXT NOT NULL CHECK(review_status = 'quarantined'),
        active INTEGER NOT NULL CHECK(active = 0), created_at TEXT NOT NULL
      );
      CREATE VIRTUAL TABLE chunk_search USING fts5(content, content='chunks', content_rowid='rowid');
      CREATE TRIGGER chunks_ai AFTER INSERT ON chunks BEGIN
        INSERT INTO chunk_search(rowid, content) VALUES (new.rowid, new.content);
      END;
    """)
    return connection


def write_source_manifest(corpus: Path, target: Path, tenant_id: str, source_id: str,
                          inventory: dict) -> Path:
    corpus = corpus.resolve()
    if not corpus.is_dir():
        raise ValueError("La carpeta privada autorizada no está disponible.")
    documents = [{
        "document_id": item["document_id"],
        "relative_path": item["relative_path"],
        "source_sha256": item["source_sha256"],
        "data_class": item["data_class"],
    } for item in inventory.get("documents", [])]
    manifest = {
        "tenant_id": tenant_id, "source_connection_id": source_id,
        "corpus_root": str(corpus), "documents": documents,
        "content_stored_remotely": False, "external_ai_calls": 0,
    }
    path = target.resolve().with_name("source-manifest.json")
    temporary = path.with_suffix(".tmp")
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    os.replace(temporary, path)
    os.chmod(path, 0o600)
    return path


def main() -> None:
    config = parse_args()
    corpus = config.corpus.resolve()
    target = config.out.resolve()
    inventory = json.loads(config.inventory.read_text(encoding="utf-8"))
    if inventory.get("tenant") != config.tenant or inventory.get("privacy", {}).get("external_ai_calls") != 0:
        raise ValueError("El inventario no pertenece al tenant o no conserva el contrato sin IA.")
    if target.is_relative_to(corpus):
        raise ValueError("El índice no puede escribirse dentro del corpus autorizado.")

    allowed = {
        item["relative_path"]: item
        for item in inventory.get("documents", [])
        if item.get("data_class") == "internal" and item.get("decision") in ELIGIBLE_DECISIONS
    }
    target.parent.mkdir(parents=True, exist_ok=True)
    connection = prepare_database(target)
    now = datetime.now(timezone.utc).isoformat()
    counts = {"documents_indexed": 0, "chunks_quarantined": 0, "personal_excluded": 0,
              "placeholders_excluded": 0, "duplicates_excluded": 0, "extraction_errors": 0}
    seen: set[str] = set()
    try:
        for relative, document in sorted(allowed.items()):
            path = corpus / relative
            try:
                text = extract(path)
            except Exception:
                counts["extraction_errors"] += 1
                continue
            inserted = 0
            source_hash = document.get("source_sha256") or file_sha256(path)
            for ordinal, paragraph in enumerate(paragraphs(text)):
                if privacy_blocked(paragraph):
                    counts["personal_excluded"] += 1
                    continue
                if PLACEHOLDER.search(paragraph):
                    counts["placeholders_excluded"] += 1
                    continue
                content_hash = hashlib.sha256(paragraph.encode("utf-8")).hexdigest()
                if content_hash in seen:
                    counts["duplicates_excluded"] += 1
                    continue
                seen.add(content_hash)
                chunk_id = hashlib.sha256(f"{config.tenant}:{config.source_id}:{content_hash}".encode()).hexdigest()[:24]
                connection.execute("""INSERT INTO chunks VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'internal', 'quarantined', 0, ?)""",
                    (chunk_id, config.tenant, config.source_id, document["document_id"], source_hash,
                     relative, ordinal, paragraph, content_hash, now))
                inserted += 1
            if inserted:
                counts["documents_indexed"] += 1
                counts["chunks_quarantined"] += inserted

        metadata = {
            "tenant_id": config.tenant, "source_connection_id": config.source_id,
            "created_at": now, "processing": "local_only", "external_ai_calls": 0,
            "activation": "human_approval_required", "embedding_state": "not_started",
            "retrieval_mode": "local_fts_quarantine", **counts,
        }
        connection.executemany("INSERT INTO metadata VALUES (?, ?)", [(key, json.dumps(value)) for key, value in metadata.items()])
        connection.commit()
    finally:
        connection.close()
    temporary = target.with_suffix(".tmp")
    os.replace(temporary, target)
    os.chmod(target, 0o600)
    manifest_path = write_source_manifest(corpus, target, config.tenant, config.source_id, inventory)
    result = {**counts, "external_ai_calls": 0, "embedding_state": "not_started",
              "index_sha256": file_sha256(target), "index": str(target),
              "local_manifest": str(manifest_path)}
    print(json.dumps({"ok": True, **result}, ensure_ascii=False))


if __name__ == "__main__":
    main()
