# Agentic Architecture

## Principle

Agents are permissioned services, not autonomous black boxes. Each agent has a scope, allowed data classes, allowed tools, output contract, and audit trail.

## MVP Agents

| Agent | Purpose | Data access | Human gate |
| --- | --- | --- | --- |
| Explorer Agent | Find and refresh grant calls | Public sources | No |
| Change Monitor Agent | Detect deadline, criteria, document, budget, and submission changes | Platform-public and platform-curated evidence | No, but critical changes trigger review |
| Entity Research Agent | Analyze an entity public website and propose profile facts, logo candidates, and matching themes | Public entity website with explicit consent | Yes before facts become approved context |
| Match Agent | Explain fit, risks, missing data | Public grants + approved profile facts | Before action |
| Governance Agent | Classify internal snippets and block unsafe use | Metadata + user-provided snippets | Yes for internal approval |
| Documentary Agent | Extract requirements, build Word documentation packages, and prepare tenant-scoped draft files | Public bases/PDF text; approved tenant facts; tenant Drive only when contracted and authorized | Before candidate becomes project and before final checklist/export |
| Draft Agent | Create proposal outlines | Public evidence + approved internal facts | Before export |
| Monitor Agent | Produce alerts and reminders | Match summaries + deadlines | Before non-public channel send |

## Orchestrator Responsibilities

- Authenticate user and tenant.
- Resolve intent.
- Check permissions and data policy.
- Route to one or more agents.
- Attach source evidence.
- Store audit events.
- Recompute tenant impact when a monitored opportunity changes.
- Return channel-safe or app-rich responses.

## Candidate To Project Gate

A preselected candidate is not a project. The orchestrator may mark it as "in documentation" only after the Documentary Agent has produced a Word package and recorded its decisions.

Minimum Documentary Agent output:

- Word-compatible memoria tecnica draft.
- Word-compatible checklist documental.
- Word-compatible annex/evidence index.
- Word-compatible budget guide.
- Decision log explaining whether tenant Drive was used.
- Storage pointer in tenant-scoped Blob.

If tenant Drive is not contracted or not authorized, the agent must say so explicitly and generate from public evidence plus approved tenant facts only. No document may be submitted, sent, or externally shared without human approval.

The first backend surface is `POST /api/candidature-document-package`. It requires an active tenant membership, writes Word-compatible files under `tenants/{tenantId}/candidatures/{opportunityId}/...`, and records an audit event. If the API or Blob credentials are not available, the UI must keep a local download fallback and tell the user that Blob persistence did not happen.

## Match Agent Entity Context

Before ranking an opportunity, the Match Agent must load the active tenant profile: territory, legal form, collectives, programs, operating area, exclusions, and approved facts. Public grants outside the entity operating territory must not appear as normal candidates. They can be logged as discarded with a reason such as "territory outside active tenant scope".

For a Valencian entity profile, statewide Spanish calls and Comunitat Valenciana calls can remain candidates. Provincial calls for Huelva, Cadiz, Teruel, Granada, London, or worldwide programs require explicit user intent before surfacing as candidates.

Closed calls must not appear in the default "live opportunities" ranking. Keep them as archived or historical evidence with a clear reason, not as active candidates for preparation.

## Channel Adapters

- Teams, WhatsApp, email, and future channels must stay thin.
- Adapters send intent to the orchestrator and display short responses.
- Full evidence, private facts, and editing remain in the web app.

## Example Channel Request

User: "Busca ayudas de insercion laboral abiertas en Comunitat Valenciana."

Response: "He encontrado 3 candidatas. La mejor encaja por territorio y colectivo, pero falta confirmar el requisito de cofinanciacion. Ver analisis completo: /opportunities/labora-2026."
