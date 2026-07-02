# Private Funder Radar Loop - 2026-06-29

## Intent

Extend the product concept from public grants only to the full third-sector funding spectrum: public calls, private-open funder calls, foundation/banking/CSR opportunities, federation alerts, and tenant-private opportunities.

## Files Touched

- `docs/architecture/private-funder-radar-loop.md`
- `docs/architecture/public-radar-loop.md`
- `docs/product/master-context.md`
- `docs/product/prd.md`
- `docs/product/app-flow.md`
- `prototype/mock-data.js`
- `prototype/app.js`
- `data/private-open-funders/platform-open-funders-v1.json`

## Verification

- `npm run check:stability` passed: TypeScript clean and line-budget guardrail clean.
- Browser verification on `http://127.0.0.1:4179/index.html#view-opportunities` confirmed the opportunity radar renders, private source badges are present, the new provenance fields render in the detail panel, and no console errors were reported.
- Vuelta 1 private-open funder catalogue added with 12 official source candidates, no scraping, and no tenant-private material.

## Residual Risks

- Private funder examples are mock/prototype data, not live verified calls.
- No real private-funder ingestion, deduplication, or scraping has been added.
- A future backend cut should add explicit metadata columns or JSON schema for `funder_type`, `access_model`, `source_scope`, and `evidence_quality`.
