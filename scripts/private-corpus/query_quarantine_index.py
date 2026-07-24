from __future__ import annotations

import argparse
import hashlib
import json
import re
import sqlite3
import unicodedata
from pathlib import Path
from typing import Iterable


STOP_WORDS = {
    "para", "por", "con", "una", "uno", "unos", "unas", "del", "las", "los",
    "que", "como", "desde", "sobre", "entre", "esta", "este", "estos", "estas",
    "sus", "sin", "documento", "documentos", "proyecto", "proyectos",
}


def normalized_terms(question: str) -> list[str]:
    plain = unicodedata.normalize("NFD", question.lower())
    plain = "".join(char for char in plain if unicodedata.category(char) != "Mn")
    terms = re.findall(r"[a-z0-9ñ]{3,}", plain)
    return list(dict.fromkeys(term for term in terms if term not in STOP_WORDS))[:12]


def approved_ids(values: Iterable[str], approved_json: Path | None) -> set[str]:
    result = {str(value).strip() for value in values if str(value).strip()}
    if approved_json:
        payload = json.loads(approved_json.read_text(encoding="utf-8"))
        items = payload.get("approvedDocumentIds", []) if isinstance(payload, dict) else payload
        if not isinstance(items, list):
            raise ValueError("La allowlist aprobada debe ser una lista de document_id.")
        result.update(str(value).strip() for value in items if str(value).strip())
    if not result:
        raise ValueError("La consulta requiere al menos un documento aprobado.")
    if len(result) > 500:
        raise ValueError("La allowlist supera el máximo de 500 documentos.")
    return result


def metadata(connection: sqlite3.Connection) -> dict[str, object]:
    return {
        str(row["key"]): json.loads(str(row["value"]))
        for row in connection.execute("SELECT key, value FROM metadata")
    }


def query_index(
    index_path: Path,
    tenant_id: str,
    source_id: str,
    question: str,
    allowed_document_ids: set[str],
    limit: int = 6,
) -> dict[str, object]:
    if not question.strip() or len(question) > 1200:
        raise ValueError("La pregunta debe contener entre 1 y 1.200 caracteres.")
    if not index_path.is_file():
        raise ValueError("El índice privado local no está disponible.")
    terms = normalized_terms(question)
    if not terms:
        raise ValueError("La pregunta necesita términos más concretos.")
    safe_limit = max(1, min(int(limit), 10))
    connection = sqlite3.connect(f"file:{index_path.resolve()}?mode=ro", uri=True)
    connection.row_factory = sqlite3.Row
    try:
        index_meta = metadata(connection)
        if index_meta.get("tenant_id") != tenant_id or index_meta.get("source_connection_id") != source_id:
            raise ValueError("El índice no pertenece al tenant y fuente solicitados.")
        placeholders = ",".join("?" for _ in allowed_document_ids)
        fts_query = " OR ".join(f'"{term}"' for term in terms)
        rows = connection.execute(
            f"""
            SELECT chunks.id, chunks.document_id, chunks.relative_path, chunks.ordinal,
                   chunks.source_sha256, chunks.content, bm25(chunk_search) AS rank
            FROM chunk_search
            JOIN chunks ON chunks.rowid = chunk_search.rowid
            WHERE chunk_search MATCH ?
              AND chunks.tenant_id = ?
              AND chunks.source_connection_id = ?
              AND chunks.data_class = 'internal'
              AND chunks.review_status = 'quarantined'
              AND chunks.active = 0
              AND chunks.document_id IN ({placeholders})
            ORDER BY rank, chunks.relative_path, chunks.ordinal
            LIMIT ?
            """,
            [fts_query, tenant_id, source_id, *sorted(allowed_document_ids), safe_limit],
        ).fetchall()
    finally:
        connection.close()
    citations = [{
        "chunkId": str(row["id"]),
        "documentId": str(row["document_id"]),
        "title": Path(str(row["relative_path"])).name,
        "relativePath": str(row["relative_path"]),
        "ordinal": int(row["ordinal"]),
        "sourceSha256": str(row["source_sha256"]),
        "excerpt": str(row["content"])[:800],
        "retrievalScore": round(abs(float(row["rank"])), 6),
    } for row in rows]
    return {
        "mode": "local_fts_approved_v1",
        "queryHash": hashlib.sha256(question.strip().encode("utf-8")).hexdigest(),
        "approvedDocumentCount": len(allowed_document_ids),
        "selectedChunkCount": len(citations),
        "citations": citations,
        "externalAiCalls": 0,
        "contentStoredRemotely": False,
        "humanReviewRequired": True,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Recupera fragmentos aprobados del índice privado local.")
    parser.add_argument("--index", required=True, type=Path)
    parser.add_argument("--tenant", required=True)
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--question", required=True)
    parser.add_argument("--approved-document-id", action="append", default=[])
    parser.add_argument("--approved-json", type=Path)
    parser.add_argument("--limit", type=int, default=6)
    return parser.parse_args()


def main() -> None:
    config = parse_args()
    allowlist = approved_ids(config.approved_document_id, config.approved_json)
    result = query_index(
        config.index, config.tenant, config.source_id, config.question, allowlist, config.limit
    )
    print(json.dumps({"ok": True, "data": result}, ensure_ascii=False))


if __name__ == "__main__":
    main()
