# Master Context: Subvenciones RAG

## Product Purpose

Subvenciones RAG is a privacy-first funding intelligence cockpit for third-sector and social-impact entities. It helps organizations discover public grants, private-open funder calls, and approved tenant-private opportunities, understand why a call may fit, prepare reviewable candidatures, and keep evidence and audit trails visible.

Novaterra is only the pilot tenant. The product must work for many independent entities with isolated data, users, sources, embeddings, permissions, audit events, and configuration.

## Third-Sector Posture

The product is built for organizations whose economic activity supports a social mission rather than ordinary profit maximization. This changes the product strategy:

- public grant discovery should remain low-friction
- paid value should come from operational support, not artificial scarcity
- pricing should be socially proportionate
- sensitive beneficiary data must never become a product asset
- private embeddings and tenant data must never be reused across tenants
- AI outputs are advisory and explainable, not automatic eligibility decisions

Canonical reference: `docs/product/third-sector-principles.md`.

## Core Product Flows

1. Public visitor searches public opportunities without login.
2. Entity requester submits a minimal onboarding request.
3. Entity admin accepts invite, terms, and consent gates.
4. Public-web analysis is optional and creates suggestions, not approved facts.
5. Entity users search the public radar and discuss opportunities with the assistant.
6. Admins can approve facts, sources, and connectors.
7. Users preselect opportunities into a candidate workspace.
8. Documentary and draft agents prepare checklists and Word drafts for human review.
9. Audit records imports, retrievals, generations, approvals, exports, and channel actions.

## Architecture Direction

- Vercel-first frontend and API functions.
- Supabase/Postgres as source of truth.
- pgvector-ready storage for chunks and embeddings.
- Vercel Blob for originals, extracted text, snapshots, PDFs, and DOCX.
- Public and private-open sources indexed through platform campaigns.
- Platform campaigns use cheap detection first and cap AI interpretation at daily per campaign by default.
- Entity public websites are analyzed by an Entity Research Agent only after consent; suggested facts and logo candidates require human approval.
- Tenant-private sources indexed only inside the active tenant boundary.
- Workers handle ingestion, extraction, chunking, embeddings, and source sync.

## Trust Boundaries

- Platform-public corpus: official/public opportunities reusable across tenants.
- Tenant-private corpus: approved sources for one entity only.
- Tenant-approved facts: reviewed profile or interview facts used for matching/drafting.
- Sensitive or blocked data: not chunked, embedded, or sent to models.

Every private row, chunk, document, embedding, match, draft, audit event, and cost record must be tenant-scoped.

## Agents

Agents are permissioned services with scopes, inputs, outputs, and audit events:

- Busqueda de convocatorias / Explorer: public and approved source refresh.
- Investigador de entidad / Entity Research: public website analysis, logo candidates, and suggested facts.
- Asistente de encaje / Match: fit, risks, missing data, and evidence.
- Revision documental / Documentary: requirements, bases, checklists.
- Borrador de memoria / Draft: Word drafts with evidence and approved facts.
- Avisos y recordatorios / Monitor: alerts and channel-safe summaries.

No agent may access sensitive/private tenant data unless policy allows it. No agent may submit, send, or externally share without human approval.

Control de datos / Governance no es un agente de análisis: es la capa transversal que aplica permisos, consentimiento, aislamiento tenant, clases de datos permitidas, auditoría y puertas de revisión humana.

## Current Implementation State

- Static/clickable cockpit exists in `prototype/`.
- Supabase-oriented schema/API work has started.
- Public BDNS radar loop exists as reproducible local script.
- Tenant onboarding, roles, and credentials are partially simulated in the prototype.
- Entity cockpit now distinguishes contracted assistants, tools, detected facts, and human validation.
- Matching RAG, connected cockpit, real embeddings, real channels, and production-grade workers remain pending.
- The private funder radar loop is documented but not yet implemented as a real ingestion campaign.

## Key Documents

- `docs/product/prd.md`
- `docs/product/third-sector-principles.md`
- `docs/product/data-governance-brief.md`
- `docs/product/access-onboarding-and-social-pricing.md`
- `docs/product/app-flow.md`
- `docs/product/agentic-architecture.md`
- `docs/product/mvp-execution-plan.md`
- `docs/architecture/multi-tenant-isolation.md`
- `docs/architecture/rag-privacy-and-indexing.md`
- `docs/architecture/private-funder-radar-loop.md`
- `docs/architecture/secure-onboarding-auth-flow.md`
- `docs/architecture/backend-scalability.md`
