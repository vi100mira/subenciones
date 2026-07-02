# Private Funder Radar Loop

## Objective

Extend the opportunity radar beyond public grants so third-sector entities can see the full funding spectrum: public calls, foundations, banking social programs, corporate social responsibility calls, federation alerts, prizes, challenges, sponsorships, and tenant-specific private opportunities.

This is still a grants intelligence product. Private funder discovery must preserve evidence, uncertainty, human review, tenant isolation, and data minimization.

Private-open funders also need the same change-detection contract as public bodies. A foundation, bank, or federation can update deadlines, bases, criteria, FAQs, and forms after a call is first detected. Every accepted private-open source must therefore support versioning, evidence diffs, and tenant impact alerts before it is treated as reliable operational data.

Private-open monitoring should be cost-aware. Weekly review is the default for editorial/private-open catalogues, with daily AI interpretation only while a live or high-priority call is active. The platform can still perform cheap hash/etag checks more often, but AI should only be used after a detected change and never more than daily by default.

## Source Classes

| Class | Example | Scope | Reusable |
| --- | --- | --- | --- |
| Public official | BDNS, BOE, DOGV, LABORA | `platform_public` | Yes |
| Private open | Foundation or bank social calls published on the funder website | `platform_public` or `platform_curated` | Yes, after curation |
| Private curated | Manually reviewed funder pages, annual recurring calls, sector portals | `platform_curated` | Yes, with quality flags |
| Tenant private opportunity | Emails, PDFs, partner notices, invitation-only calls, relationship-based funder material | `tenant_private` | No |
| Blocked private | Sensitive beneficiary files or broad internal folders | `blocked` | No |

The key distinction is not whether the funder is public or private. It is whether the opportunity evidence is openly available and reusable, or belongs to one tenant relationship.

## Loop Shape

### Loop 1: Source Discovery

Goal: build a curated source map of private funders relevant to third-sector work.

Inputs:

- foundation and banking social-program pages
- corporate CSR and social innovation programs
- federation and umbrella-entity funding alerts
- historical calls known by pilot entities
- manually suggested sources from entity admins

Stop when:

- three consecutive discovery passes add few useful new opportunities
- new sources produce more duplicates, stale calls, or unverifiable pages than valid candidates
- the initial catalogue covers the main themes for the pilot segment: employment, inclusion, youth, disability, housing, cooperation, social innovation, and community action
- the prototype can demonstrate public plus private-open plus tenant-private opportunities without relying on fragile scraping

### Loop 2: Normalization

Goal: normalize private opportunities into the same opportunity experience as public grants.

Additional fields:

- `funder_type`: public, foundation, bank, company, federation, philanthropy, prize, challenge
- `funding_type`: grant, donation, agreement, prize, sponsorship, challenge, soft loan
- `access_model`: open, invitation, territorial, historical, relationship, manual
- `source_scope`: platform public, platform curated, tenant private, blocked
- `evidence_quality`: official direct, curated page, PDF received, email received, manual note
- `deadline_confidence`: high, medium, low, uncertain

Stop when each candidate can show title, funder, territory, deadline or uncertainty, amount or range, requirements, evidence, risks, and next human action.

### Loop 3: Combined Matching

Goal: rank public and private opportunities together while keeping provenance visible.

Rules:

- open private funders can be searched with the platform corpus
- tenant-private opportunities require tenant membership and source permission
- tenant-private evidence is never reused for another entity
- recommendations must mark whether they used only public/open evidence or also approved tenant facts
- uncertain deadlines, informal invitations, and relationship-based access must be shown explicitly

Stop when a recommendation explains fit, non-fit, missing data, evidence, source scope, and review status without presenting the result as automatic eligibility.

### Loop 4: Quality And Operations

Goal: prevent the private funder radar from becoming a noisy directory.

Pause or demote a source when:

- it fails three syncs in a row
- more than 30-40% of candidates have unclear or stale deadlines
- evidence cannot be traced to a direct funder page, received document, or approved manual note
- duplicates repeatedly appear across funder pages and federation alerts
- the source requires login, invitation, or relationship context that cannot be shared platform-wide
- the cost of manual review exceeds the value of the opportunities found

## UI Implications

Use "Oportunidades" or "Financiacion" as the umbrella term, with filters for:

- Publicas
- Fundaciones
- Bancos / obra social
- Empresas / RSC
- Federaciones
- Privadas del tenant
- Historicas

Every opportunity should show:

- source scope
- funder type
- evidence quality
- deadline confidence
- privacy/data class label
- human review state

## Backend Implications

The current `private_funder` kind can support the first cut, but the product should add explicit metadata before real ingestion:

- source scope and promotion rules
- funder type
- access model
- evidence quality
- quality thresholds
- deduplication keys across public and private-open sources
- change monitoring cadence
- AI cadence cap, default budget, and manual-run reason
- last verified version and critical-change policy

Do not promote a tenant-private opportunity into the platform corpus unless a human platform admin verifies that the same evidence is openly available and not relationship-confidential.

## Vuelta 1 Catalogue

The first platform-curated catalogue is stored in `data/private-open-funders/platform-open-funders-v1.json`.

Vuelta 1 result:

- 12 official private-open funder sources reviewed.
- 12 accepted as platform catalogue candidates.
- 6 active, open, or open-by-line sources identified.
- 5 monitor-only recurrent sources identified.
- 1 source kept behind human review before surfacing as live.
- 0 tenant-private sources used.
- 0 scraping used.
