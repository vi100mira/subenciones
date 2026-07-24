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
- minimal onboarding fields only: entity name, public website, admin email, public-web analysis consent, and optional uploaded logo
- Entity Research Agent proposes territory, entity type, themes, collectives, programs, and logo candidates from the public website
- tenant-aware source endpoints using explicit `x-tenant-id` or `tenantId`
- prototype screen for the platform console

Acceptance:

- A superadmin can create an entity.
- A tenant can be created before type/territory are known, as long as suggested facts remain pending review.
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

Estado: parcial; chunking disponible y consumidor privado completo pendiente.

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

Estado: base operativa; encaje alojado condicionado a perfil aprobado.

Deliverables:

- retrieve from platform-public corpus
- retrieve from tenant-private corpus only when allowed
- combine evidence with approved tenant facts
- produce explainable match: fit, risks, missing data, evidence, deadline confidence

Acceptance:

- Every recommendation cites public evidence.
- Internal facts used are visible.
- No recommendation can retrieve private chunks from another tenant.

## Hito 4b: Cambios, Versiones y Alertas

Estado: base operativa para versiones y alertas dentro de la app; emisores externos pendientes.

Deliverables:

- version platform opportunities instead of overwriting them
- detect deadline, criteria, document, budget, and submission-channel changes
- run cheap source detection before AI and cap AI interpretation at daily per campaign by default
- mark old evidence and chunks as superseded
- compute which tenants are affected by a changed opportunity
- create in-app alerts with evidence, previous value, new value, confidence, and recommended human action
- keep external channel notifications safe and linked back to the app

Acceptance:

- A changed deadline creates a critical alert only for affected tenants.
- AI cost is visible per platform campaign, and manual reruns require an audit reason.
- A draft or checklist generated from an old version is marked as needing review.
- Unaffected tenants are not notified.
- The alert does not expose tenant-private data in platform logs or external channels.

## Hito 5: Cockpit Conectado

Estado: parcial; cockpit conectado en flujos críticos y demostraciones aún presentes.

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

Estado: en validación con tenant piloto, sin convertirlo en supuesto global.

Deliverables:

- run with one real or simulated entity
- import approved internal snippets
- run public source campaign
- generate first explainable recommendations
- review data governance and deletion/export flow

Acceptance:

- A second tenant can be added without data leakage.
- The pilot can explain who has the information, where it is stored, and what leaves the tenant boundary.
