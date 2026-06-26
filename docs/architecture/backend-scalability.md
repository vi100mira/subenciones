# Backend Scalability Notes

## Requirement

The system must work for one input folder and for thousands of source folders or grant calls without changing the product model.

## Design Choices

- Multi-tenant from the first schema: every document belongs to a tenant.
- Any pilot tenant is only a validation case; the same architecture must support many isolated entities.
- Source abstraction: local folder, Google Drive, Microsoft Graph, BDNS, and manual uploads share one connector contract.
- Idempotent ingestion: documents are keyed by tenant, source, and external id; content hash avoids duplicate work.
- Appendable audit: imports, updates, blocked documents, agent runs, exports, and approvals must be logged.
- Separated trust boundaries: public grant corpus and private entity corpus are indexed separately.
- Private embeddings are tenant-private data and must never be reused across tenants.
- Public sources are indexed once through campaigns and then synchronized incrementally by hash/etag/version.
- Batch-ready services: ingestion can run from CLI now, worker/queue later.

## Scale Path

| PMV | Later |
| --- | --- |
| SQLite | PostgreSQL |
| CLI ingestion | Queue workers |
| Local folder connector | Google Drive / Microsoft Graph connectors |
| Text files | PDF/DOCX extraction pipeline |
| Simple keyword chunks | Vector + hybrid retrieval |
| Single process | Horizontal workers per tenant/source |
| Manual source refresh | Incremental sync by cursor/hash |

## Ingestion Flow

1. Connector lists source items.
2. Pipeline classifies item.
3. Sensitive/blocked files are audited and skipped.
4. Existing hash is checked.
5. Changed documents are extracted and upserted.
6. Run metrics are persisted.
7. Later RAG stages chunk, embed, and index approved text.

## Public vs Private Indexes

Platform-public sources such as BDNS, BOE, DOGV, GVA, and LABORA should be indexed once for the platform and reused across entities until the source changes.

Tenant-private sources such as an entity Drive or SharePoint folder must be indexed with `tenant_id` and never reused across entities. Embeddings derived from private documents are private too.

## Current API Backbone

- `admin-organizations`: platform superadmin creates and lists tenants.
- `tenant-config`: entity admins manage logo, color, profile, motivations, and onboarding state.
- `admin-platform-sources`: platform superadmin manages reusable public sources.
- `admin-platform-campaigns`: platform superadmin queues public indexing campaigns.
- `source-connections`: entity admins manage tenant-scoped private/public sources.
- `ingestion-dispatch`: entity admins queue tenant-private ingestion jobs.

## Why This Matters

The frontend can show one opportunity today, but the backend shape already supports thousands of documents, many tenants, and multiple corporate drives. We avoid rewriting the core when replacing local simulation with real Drive connectors.

See `docs/architecture/multi-tenant-isolation.md` for the tenant boundary rules.
