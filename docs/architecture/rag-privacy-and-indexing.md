# RAG Privacy and Indexing

## Core Decision

Use two logical corpus families from the beginning:

- Platform/public corpus: official and public funding opportunities reusable across tenants.
- Tenant/private opportunity corpora: approved opportunity sources belonging to exactly one entity.
- Tenant-approved facts: minimal profile and approved facts used to improve matching, not a broad dump of company/entity data.

Both may live in the same Supabase tables, but every query must enforce scope, tenant, source status, data class, and governance policy.

Novaterra or any other named organization is only a tenant instance. The retrieval, indexing, and governance rules must be identical for every entity using the product.

## Privacy Boundary

Any entity's private information remains private when:

- every private document has the correct `tenant_id`
- every private chunk has the same tenant id
- embeddings derived from private text are treated as private data
- RLS and API filters always constrain by tenant
- agents can only read sources allowed by their policy
- logs never contain full private text, prompts, access tokens, or raw retrieved context
- data classes `sensitive` and `blocked` are never chunked, embedded, or sent to models

Embeddings are not human-readable text, but they are derived from private data. Treat private embeddings as tenant-private data.

## Corpus Scopes

Use explicit visibility/scope semantics:

| Scope | Meaning | Reusable across tenants |
| --- | --- | --- |
| `platform_public` | BDNS, BOE, DOGV, official public portals | Yes |
| `tenant_public` | public or semi-public sources curated by one entity | Usually no, unless promoted |
| `tenant_private` | Drive/SharePoint/internal approved sources for one entity | No |
| `blocked` | sensitive or prohibited source | No |

## Product Retrieval Modes

Use four product modes, even if the storage tables are shared:

| Mode | Purpose | Requires private data |
| --- | --- | --- |
| Public radar | Search and rank platform-public opportunities | No |
| Public RAG | Ask questions over public calls, bases, deadlines, requirements, and evidence | No |
| Private opportunity radar | Search tenant-approved private opportunities, such as PDFs, emails, federation alerts, or historical calls | Yes, only approved sources |
| Private RAG | Ask questions over one tenant's private opportunity sources and approved facts | Yes, tenant-isolated |

The private RAG is not a general-purpose assistant over all company data. It is scoped to opportunities, funding intelligence, approved grant context, and explicitly approved facts.

## Retrieval Rules

For an entity matching query:

1. Search platform-public chunks.
2. Use the tenant minimal profile for basic ranking.
3. Search that entity's tenant-private opportunity chunks only if user intent and permissions allow it.
4. Never search another tenant's private chunks.
5. Filter out closed/inactive sources unless the user explicitly asks historical analysis.
6. Return evidence with source, document id, chunk id, data class, and confidence.

Iterative AI search should refine retrieval and filters. It must not silently broaden access to private sources or ask for unnecessary sensitive context.

## Public Source Indexing

Public sources should be indexed once and reused until they change.

Recommended flow:

1. Initial indexing campaign for BDNS/GVA/LABORA/BOE/etc.
2. Store source hash, etag, version, official URL, validity dates, and indexed timestamp.
3. On sync, skip unchanged sources.
4. Re-extract, rechunk, and re-embed only changed or new documents.
5. Mark stale documents as superseded instead of deleting evidence immediately.

Do not fetch and vectorize all public sources on every user query.

## Indexing Campaigns

Large indexing is a campaign, not a single request:

```text
indexing_campaign
  source: BDNS
  status: running
  total_documents: 20000
  batch_size: 100
  completed: 8500
  failed: 12
```

Each batch must be idempotent and re-runnable.

## Worker Responsibilities

The ingestion/vectorization worker:

- reads queued ingestion runs
- lists source items
- checks hash/etag
- blocks sensitive data
- preserves originals in Blob when needed
- extracts text
- chunks approved text
- computes embeddings
- writes chunks to pgvector
- updates run metrics
- writes audit events

The first worker cut can stop after chunk creation with `embedding = null`. That is still useful because it validates tenant isolation, data classification, idempotency, and pgvector-ready storage before any external embedding call is introduced.

## Matching Agent Use

The Match Agent should not ask the model to "find grants" from raw memory. It should:

1. retrieve relevant chunks from the scoped indices
2. assemble evidence
3. compare with approved entity facts
4. explain fit, risks, missing data, and next checks

## Operational Implication

The operations panel must show:

- indexing campaign progress
- vectorization backlog
- public source freshness
- private source freshness
- blocked documents
- cost by tenant/source/agent

## Tenant-Specific Motivation

Each entity may have different motivations, territories, language preferences, funder priorities, risk tolerance, and internal vocabulary. Store these as tenant configuration or approved profile facts, not as global assumptions.

These motivations affect ranking and explanation but must not weaken tenant isolation.
