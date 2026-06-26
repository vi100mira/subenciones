# Source Map Control

## Decision

The source map should be controllable by users, but only according to role, source type, and governance policy.

## Why Control Is Useful

- Each entity knows which private folders contain live grants, funder notices, federation alerts, historical opportunities, and approved grant knowledge.
- Sources vary by territory and sector; one entity may care about LABORA/GVA while another entity cares about Madrid, Catalonia, cooperation, culture, or private foundations.
- Private funders are often curated manually and may not appear in BDNS.
- Users need to pause noisy or broken sources.
- Admins need visibility into source health and last sync.

## Why It Must Be Governed

An unrestricted source map would create risks:

- Users could connect folders with sensitive beneficiary data.
- A WhatsApp/Teams workflow could expose internal data if source permissions are loose.
- Duplicate or low-quality sources could pollute matching.
- Unverified external pages could weaken evidence quality.

## Control Model

| Layer | Who controls it | Examples |
| --- | --- | --- |
| Platform-managed public sources | Platform/admin | BDNS, BOE, official gazettes |
| Tenant-managed public/sector sources | Entity admin | GVA, LABORA, Diputacion, private funders |
| Tenant private opportunity sources | Entity owner/admin | Drive folders, SharePoint libraries, emails/PDFs with opportunities, federation alerts, approved grant docs |
| Personal working sources | Optional, restricted | Manual upload drafts, temporary analysis |
| Blocked sources | Governance policy | Sensitive folders, beneficiary case files |

## Roles

- Owner/admin: connect, approve, pause, delete, prioritize.
- Analyst: request new source and read source health.
- Member/reader: use recommendations but cannot connect sources.
- Agent: can only read sources allowed by its policy.

## UI Implications

The app should show a source map panel with:

- source name
- type
- scope
- status
- health
- last sync
- priority
- data class
- owner
- actions allowed by role

## Recommended Defaults

- BDNS/SNPSAP active by platform default.
- Public official sources should use platform-managed indexing campaigns and incremental sync.
- Tenant private opportunity sources start as `pending_approval`.
- Tenant private vectors and embeddings are never promoted or reused across tenants.
- Source maps are tenant-specific except for platform-managed public sources.
- Tenant-specific source maps let each entity use the same product skeleton with its own motivations, folders, territorial priorities, and funder preferences.
- Do not ask a tenant to connect broad company/entity storage. Ask for narrow opportunity folders or approved uploads.
- Any folder named or classified as sensitive is blocked.
- New sources should run a dry-run classification before indexing.
- Users can request a source; only admins approve ingestion.

## Answer

Yes, it conviene. But it should be a controlled source map, not a free-form list. The map is part of governance and product trust.
