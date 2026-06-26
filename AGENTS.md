# AGENTS.md

## Product Posture

- Build a privacy-first grants intelligence product for NGOs and social-impact entities.
- Build for many independent entities, not for one bespoke customer. Novaterra is only the pilot/example tenant.
- Every entity must be isolated as its own tenant while sharing the same product skeleton.
- Treat the product as an operational SaaS cockpit, not a marketing landing page.
- Keep entity data under entity control. External AI calls must receive only approved, minimal context.
- Design matching as explainable recommendations with evidence, not automatic eligibility decisions.
- Require human review before exporting, submitting, sending, or sharing generated grant content.

## Design Rules

- The first screen must be the actual working app.
- Avoid generic AI aesthetics: no decorative gradient blobs, oversized empty hero sections, vague slogans, or card-heavy filler.
- Use restrained, professional UI: dense but readable tables, filters, side panels, status badges, timelines, and evidence blocks.
- Use realistic Spanish grant/subsidy language and domain-specific mock data.
- Every screen must handle at least one realistic state: data, empty, warning, review, or audit.
- Make trust visible: source links, deadline confidence, internal facts used, data class labels, and audit events.
- Prefer familiar icon buttons and compact controls. Use text buttons only for clear commands.
- Do not hide uncertainty. Mark unclear deadlines, missing requirements, and privacy risks explicitly.

## App Architecture Direction

- Prototype UI before backend.
- Keep mocks separate from UI code so they can later be replaced by API calls.
- Build and deploy as a Vercel-first product:
  - Frontend in React/Vite first, migratable to Next.js only when routing/server rendering requires it.
  - Production API endpoints in `api/*.ts` Vercel Functions.
- Supabase/Postgres with pgvector for tenants, sources, documents, chunks, embeddings, and audit.
  - Vercel Blob for original files, PDFs, DOCX, snapshots, and extracted text artifacts.
  - Python utilities are acceptable for local experiments or offline workers, but not the primary Vercel runtime unless explicitly chosen.
- Design for an agentic backend from the beginning:
  - Agents are specialists with names, scopes, permissions, inputs, outputs, and audit trails.
  - Channel adapters such as Teams or WhatsApp must call the orchestrator; they must not contain product logic.
  - No agent may access sensitive/private tenant data unless its permission policy allows it.
  - No agent may submit or externally send information without explicit human approval.
- Separate public grant retrieval from private entity retrieval.
- Treat embeddings derived from private documents as private tenant data.
- Use platform-public vectors for public sources and tenant-private vectors for each entity's sources; never retrieve another tenant's private chunks.
- Every entity must have isolated data, sources, private embeddings, agent permissions, audit events, cost accounting, and configuration.
- Ingest public sources with an initial indexing campaign and then incremental sync by hash/etag/version, not by full reindex on every query.
- Store evidence and provenance for every recommendation.
- Keep the source map user-controllable only through role-based policies, audit, and source health checks.
- Build operational visibility into ingestion, vectorization, agents, sources, blob usage, latency, errors, and cost from the PMV stage.

## Initial MVP Scope

- One pilot entity profile, but all data models and UI concepts must support multiple isolated entities.
- Public grant/opportunity mock data inspired by BDNS, GVA, LABORA, DOGV, BOP, and private foundations.
- Private knowledge represented as approved snippets or guided-interview answers.
- Matching screen with reasons for fit, risks, missing information, and evidence.
- Eligibility checklist and proposal outline.
- Governance and audit screens.
- Operations screen for source health, queues, loads, errors, and cost.
- First real backend path uses Supabase as the source of truth; SQLite/Python remains local experimentation only.

## Implementation Expectations

- Keep the first prototype static unless a backend is explicitly requested.
- Use clear file organization: `docs/product` for product documents and `prototype` for the clickable UI.
- Prefer small, readable files over framework complexity until backend needs are clearer.
- Verify the prototype in a browser before calling the work done.
- Document non-trivial changes in `docs/changelog/`.

## Human Traceability Guardrails

- Treat maintainability by a human reviewer as a product requirement.
- Before editing, state the smallest coherent change and the files or areas likely to change.
- Keep changes narrowly scoped. Avoid broad rewrites, opportunistic refactors, formatting sweeps, and new abstractions unless they directly reduce complexity for the requested slice.
- Prefer diffs that a reviewer can understand in one pass. If a change is likely to exceed about 250 changed lines, split it or ask for approval before continuing.
- Keep UI, mock data, API handlers, database migrations, scripts, and product documents in separate files with clear ownership.
- Every non-trivial feature change must leave a short note in `docs/changelog/` describing intent, files touched, verification performed, and residual risks.
- Preserve traceability for grant recommendations: source links, evidence snippets, internal facts used, data class labels, review status, and audit events.
- Do not remove human review points before exporting, sending, submitting, or externally sharing generated grant content.
- Do not introduce external services, dependencies, or data movement without naming the privacy, cost, and tenant-isolation impact.
