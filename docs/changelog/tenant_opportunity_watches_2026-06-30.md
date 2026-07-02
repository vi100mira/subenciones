# Tenant Opportunity Watches - 2026-06-30

## Intent

Add the tenant-facing mechanism that records when an entity follows a platform opportunity. These watches are the bridge between platform change events and tenant-specific alerts.

## Files Touched

- `api/tenant-opportunity-watches.ts`
- `scripts/platform/seed-demo-watch.mjs`
- `package.json`

## Verification

- `npm run check:stability` passed.
- `npm run platform:seed-demo-watch` dry-run showed a non-sensitive Novaterra demo watch for Fundacion la Caixa.
- `npm run platform:seed-demo-watch -- --apply` created/updated the demo watch in Supabase.
- `npm run platform:generate-tenant-alerts -- --simulate-critical-event` planned 1 critical alert using the real persisted watch, without writing a fake alert.
- Read-only Supabase verification shows 1 active watch and 0 real tenant alerts.

## Residual Risks

- The prototype does not call the endpoint yet; the next UI/API integration should create watches from candidate workspace and recommendation actions.
- The demo seed creates only non-sensitive platform metadata for Novaterra demo.
