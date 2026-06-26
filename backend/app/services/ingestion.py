from __future__ import annotations

from uuid import uuid4

from app.connectors.base import SourceConnector
from app.core.models import DataClass, IngestionResult, utcnow
from app.storage.sqlite import SQLiteStore


class IngestionService:
    def __init__(self, store: SQLiteStore):
        self.store = store

    def ingest_source(self, tenant_id: str, connector: SourceConnector) -> IngestionResult:
        started_at = utcnow()
        scanned = inserted = updated = skipped = blocked = 0

        for item in connector.iter_items():
            scanned += 1
            if item.data_class in {DataClass.SENSITIVE, DataClass.BLOCKED}:
                blocked += 1
                self.store.audit(
                    tenant_id,
                    actor="ingestion",
                    action="blocked_document",
                    target=item.external_id,
                    detail={"source_id": item.source_id, "data_class": item.data_class.value},
                )
                continue

            previous_hash = self.store.get_document_hash(tenant_id, item)
            if previous_hash == item.content_hash:
                skipped += 1
                continue

            document = connector.extract(item)
            operation = self.store.upsert_document(tenant_id, document)
            if operation == "inserted":
                inserted += 1
            else:
                updated += 1

            self.store.audit(
                tenant_id,
                actor="ingestion",
                action=f"{operation}_document",
                target=item.external_id,
                detail={
                    "source_id": item.source_id,
                    "data_class": item.data_class.value,
                    "content_hash": item.content_hash,
                },
            )

        result = IngestionResult(
            run_id=str(uuid4()),
            source_id=connector.source_id,
            scanned=scanned,
            inserted=inserted,
            updated=updated,
            skipped=skipped,
            blocked=blocked,
            started_at=started_at,
            finished_at=utcnow(),
        )
        self.store.save_ingestion_run(tenant_id, result)
        return result
