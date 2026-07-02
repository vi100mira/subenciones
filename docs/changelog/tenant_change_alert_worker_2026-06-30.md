# Tenant Change Alert Worker - 2026-06-30

## Intent

Add the first tenant impact worker. It reads platform opportunity change events, finds active tenant watches for those opportunities, and creates tenant-scoped change alerts with safe channel summaries and recommended human action.

## Files Touched

- `scripts/platform/generate-tenant-change-alerts.mjs`
- `package.json`

## Verification

- `npm run platform:generate-tenant-alerts` reported 0 events, 0 watches, and 0 planned alerts against the current Supabase state.
- `npm run platform:generate-tenant-alerts -- --simulate-critical-event --simulate-demo-watch` planned 1 critical tenant alert for the Novaterra demo tenant without writing fake data.
- `npm run check:stability` passed.

## Residual Risks

- The worker depends on `tenant_opportunity_watches`; recommendation and workspace flows still need to create those watches automatically.
- Simulated tenant impact verifies planning only and does not write fake change events or alerts.
