# MVP Execution Plan

## Objective

Build a Vercel-first, privacy-first grants intelligence MVP where:

- platform superadmins manage public grant sources and vectorization campaigns
- entities receive value immediately from an AI-iterative public opportunity radar
- each entity is an isolated tenant with its own brand, profile, motivations, sources, permissions, audit, and private embeddings
- tenant-private RAG focuses on approved private opportunity sources, not broad company/entity data
- entity users work inside the cockpit prototype already defined
- no private tenant data is reused across entities

## Hito 1: Plataforma y Tenants

Estado: base implementada.

Deliverables:

- platform superadmin allowlist through OAuth email (`PLATFORM_ADMIN_EMAILS`)
- `admin-organizations` API for creating/listing entities
- `tenant_configs` for logo, color, profile, motivations, and onboarding status
- minimal onboarding fields only: identity, owner/admin, territory, entity type, themes, alerts, and consent
- tenant-aware source endpoints using explicit `x-tenant-id` or `tenantId`
- prototype screen for the platform console

Acceptance:

- A superadmin can create an entity.
- A tenant admin can read/update only its tenant config.
- A tenant can use the public radar before connecting any private source.
- Existing source and ingestion APIs do not silently pick the wrong tenant.

## Hito 2: Fuentes e Ingesta

Estado: base implementada.

Deliverables:

- `platform_sources` for BDNS, official gazettes, portals, and curated public/private funder sources
- `platform_ingestion_campaigns` for reusable public vectorization jobs
- tenant `source_connections` for Drive, SharePoint, Blob/manual upload, and curated entity sources
- ingestion dispatch endpoints for platform and tenant jobs

Acceptance:

- Platform public campaigns are separate from tenant-private ingestion runs.
- Tenant-private source uploads require tenant membership and source permissions.
- Jobs are queued/idempotent; long extraction/vectorization is not done inside a request.

## Hito 3: Worker de Extraccion y Chunking

Status: iniciado con worker de chunking.

Deliverables:

- worker reads queued tenant ingestion runs and platform campaigns
- extracts text from markdown/text first, then PDF/DOCX
- classifies data class before indexing
- blocks sensitive folders/snippets
- chunks approved text
- writes chunks to pgvector
- records metrics and audit events
- first cut: `npm run worker:chunk-documents` chunks approved `source_documents.extracted_text` rows without external AI calls

Acceptance:

- One local/simulated Drive or Blob source produces source documents and chunks.
- Blocked files are audited and not embedded.
- Re-running the same source skips unchanged documents by hash.

Next implementation cut:

- create a tenant ingestion worker that turns approved Blob/manual-upload items into `source_documents`
- then reuse `worker:chunk-documents` to create chunks
- only after this, add embedding provider integration

## Hito 4: Matching RAG Minimo

Status: pendiente.

Deliverables:

- retrieve from platform-public corpus
- retrieve from tenant-private corpus only when allowed
- combine evidence with approved tenant facts
- produce explainable match: fit, risks, missing data, evidence, deadline confidence

Acceptance:

- Every recommendation cites public evidence.
- Internal facts used are visible.
- No recommendation can retrieve private chunks from another tenant.

## Hito 5: Cockpit Conectado

Status: pendiente.

Deliverables:

- replace static tenant/source/operation mocks with API reads
- keep fallback mocks for demo mode
- tenant branding applied from `tenant_config`
- platform console lists real entities and campaigns
- operations panel lists real runs and health signals

Acceptance:

- Superadmin sees platform health and tenants.
- Entity user sees only its cockpit and private source status.
- UI remains usable with no backend secrets in browser.

## Hito 6: Pilot Review

Status: pendiente.

Deliverables:

- run with one real or simulated entity
- import approved internal snippets
- run public source campaign
- generate first explainable recommendations
- review data governance and deletion/export flow

Acceptance:

- A second tenant can be added without data leakage.
- The pilot can explain who has the information, where it is stored, and what leaves the tenant boundary.
