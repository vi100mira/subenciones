# Platform Functional Coverage

## Goal

Move the prototype from curated examples to a functional platform radar that reports what is known today, what is loaded, and what remains outside coverage.

## Three Operating Agents

| Agent | Functional job | Current prototype state | Next hardening step |
| --- | --- | --- | --- |
| Busqueda de convocatorias | Query official public sources, paginate results, normalize evidence and deadlines | BDNS/SNPSAP search refreshed on 2026-07-01: 30/572 public results loaded for `social`, 0 detail errors | Paginate all BDNS result pages in batches, persist in Supabase, then deduplicate |
| Busqueda privada abierta | Monitor official funder pages from foundations, banks, obra social, CSR and federations | 12 official private-open sources reviewed, 6 active/open or open-by-line, 20 prototype rows loaded | Add source registry expansion, official-page scraping, hash/etag checks, and editorial review |
| Investigador de entidad | Create a minimum tenant profile from consented public web and propose logo/facts/themes | UI flow defined: name, public web, admin email, consent, crawl limits | Implement worker with evidence snapshots and human approval before tenant facts are used |

## Counting Rules

- Public official count can use BDNS/SNPSAP `totalElements` for a specific query, but rows are only trusted after pagination and detail normalization.
- Private-open count cannot claim a universal market total. It is measured as catalogue coverage: sources reviewed, accepted, active/open, monitor-only, and pending human review.
- Tenant-private opportunities never contribute to the platform total unless a platform admin verifies that the same evidence is openly available.

## Definition Of Functional Prototype

The product is functional when superadmin can run or schedule the three agents and see:

- last run timestamp
- source universe and loaded rows
- error count and deadline uncertainty
- evidence quality
- what is covered, partial, or not yet covered
- human review queue before any opportunity affects a tenant recommendation
