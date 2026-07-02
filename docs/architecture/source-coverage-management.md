# Source Coverage Management

## Decision

Superadmin needs a source coverage manager for the platform radar. It is not a tenant feature and it does not read tenant-private data.

The manager exists to expand and govern three reusable source families:

- Public state sources: BDNS/SNPSAP and official national APIs.
- Territorial sources: autonomous community portals, official gazettes, provincial bulletins and employment bodies.
- Private-open sources: foundations, banks, obra social, CSR programmes and federations with public calls.

Tenant-private sources remain separate. They can inform that tenant only, unless a platform admin verifies that the evidence is publicly available.

## Operating Loop

1. Add or discover a candidate source with name, type, official URL and territory.
2. Run a cheap detector first: sitemap, index page, hash, etag, publication date and visible deadline fields.
3. Use AI only when the detector finds a meaningful change or ambiguous criteria.
4. Store a proposed source record with evidence, cadence, risk and data class.
5. Require human review before the source becomes active or before a new opportunity reaches tenant recommendations.
6. Emit tenant alerts only after a changed opportunity is versioned and linked to evidence.

## Success Metrics

- Territorial coverage: number of accepted sources by territory and source type.
- Private coverage: reviewed official sources, active/open lines, monitor-only sources and rejected sources.
- Freshness: last run per source and whether the daily maximum cadence was respected.
- Quality: deadline confidence, extraction errors and human review backlog.
- Cost: number of pages checked without AI, AI calls triggered by change, and daily budget consumption.

## UI Contract

The platform screen exposes a `Fuentes` tab with:

- Coverage summary for public, territorial, private-open and review states.
- Optional guided source intake for adding official URLs when superadmin knows a missing source.
- Source library with separate source validation, connector state, cadence and explicit blocking doubt.
- Expansion campaigns for territorial and private discovery.
- Human review queue for source activation and material changes.

## Status Semantics

The UI must not collapse all operational states into `active` or `pending`.

- `Fuente oficial` means the issuing body or funder is a valid public or private-open source.
- `Monitor activo` means the platform has a working reader for that source family.
- `Conector pendiente` means the source is valid, but extraction rules are not reliable enough to generate opportunities.
- `Solo vigilancia` means the source is checked for changes but does not yet create tenant-facing recommendations.
- `Critica`, `Requiere criterio` or `Bloqueada` must include the concrete doubt and the expected human decision.

Manual approval must resolve a named doubt. It must not simply bless an opaque source.
