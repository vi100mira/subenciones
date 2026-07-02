# Change Detection And Tenant Alerts - 2026-06-29

## Intent

Make changing deadlines, criteria, documents, budgets, and submission channels a core product capability. The platform should version opportunities, detect meaningful changes, compute affected tenants, and alert only the tenants for whom the change matters.

## Files Touched

- `docs/architecture/change-detection-and-tenant-alerts.md`
- `docs/architecture/rag-privacy-and-indexing.md`
- `docs/architecture/operations-panel.md`
- `docs/architecture/private-funder-radar-loop.md`
- `docs/product/agentic-architecture.md`
- `docs/product/mvp-execution-plan.md`

## Verification

- `npm run check:stability` passed after adding the architecture documents and private-open funder catalogue.
- `data/private-open-funders/platform-open-funders-v1.json` parses successfully as JSON.

## Residual Risks

- This is an architectural/product contract, not yet implemented in Supabase tables or workers.
- Semantic diff can be added later; the MVP should start with deterministic hashes, version rows, and explicit change events.
