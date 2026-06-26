# TutorTrace Patterns Adopted

## Why TutorTrace Matters

TutorTrace already solved several platform concerns that also appear in Subvenciones RAG: Vercel deployment, serverless API endpoints, Supabase-backed state, Vercel Blob preservation of source documents, extraction triggers, stability guardrails, and documentation discipline.

## Patterns Adopted

### Vercel-first API

Use `api/*.ts` Vercel Functions for production-facing endpoints:

- `api/source-blob-upload.ts`
- `api/source-connections.ts`
- `api/ingestion-dispatch.ts`

Python remains useful for local ingestion experiments and offline workers, but Vercel TypeScript functions are the main deployment surface.

### Blob for source preservation

Original files must be preserved outside the relational database:

- PDFs
- DOCX
- downloaded official HTML snapshots
- extracted text artifacts
- source evidence bundles

The database stores URL/path/hash/metadata, not heavy binary content.

### Supabase/Postgres as operating state

Use Supabase/Postgres for:

- organizations
- memberships
- source connections
- source documents
- chunks and embeddings
- ingestion runs
- audit events

### Async extraction

Large ingestion/extraction should be triggered and tracked, not performed inside one long user request. Vercel endpoints enqueue/dispatch work; workers update `ingestion_runs`.

### Traceability by hash

Every source document stores a SHA-256. This supports deduplication, reindexing decisions, and evidence traceability.

### Guardrails

Use simple stability checks early:

- TypeScript typecheck
- file line budgets
- documentation for non-trivial changes

## Patterns Not Copied Blindly

- TutorTrace role names and educational domain tables are not reused.
- TutorTrace's large app files are not copied; the guardrail is to avoid recreating them.
- Subvenciones keeps a stricter tenant/private/public corpus split because grant work may involve sensitive organizational data.
- Novaterra is treated as a pilot tenant; product architecture remains generic for many isolated entities.
