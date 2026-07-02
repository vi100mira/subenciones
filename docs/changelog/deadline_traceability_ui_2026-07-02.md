# Deadline Traceability UI - 2026-07-02

## Intent

Make deadlines operationally trustworthy. Every opportunity should show not only a deadline label, but how the agent interpreted it, which evidence supports it, when it was read, and what alarm rule affects the tenant.

## Files Touched

- `prototype/deadline-trace.js`
- `prototype/index.html`
- `prototype/ui-polish.js`
- `prototype/opportunity-actions.js`
- `prototype/opportunity-requirements.js`
- `prototype/stitch-theme.css`
- `docs/product/prd.md`
- `docs/architecture/change-detection-and-tenant-alerts.md`
- `supabase/migrations/20260702110000_deadline_trace_fields.sql`
- `scripts/platform/import-open-funders.mjs`
- `scripts/platform/detect-open-funder-changes.mjs`
- `scripts/radar/fetch-bdns-latest.mjs`
- `scripts/platform/import-bdns-radar.mjs`
- `docs/architecture/public-radar-loop.md`
- `package.json`

## Verification

- Local server check: `http://127.0.0.1:4190/deadline-trace.js?v=20260702-date-trace` returns 200 after restarting the dev server.
- Headless browser check on `prototype/index.html?cache=deadline-trace-file#view-opportunities`: opportunity grid shows 15 deadline trace cells with status, confidence, and review hint.
- Headless browser check: opening an opportunity analysis modal shows one deadline trace card.
- Headless browser check: preparing documentation and opening `Fechas` in the active candidature shows source, evidence date, agent read date, next review, tenant alarm, and uncertainty.
- Schema update adds persistent deadline trace columns to `platform_opportunity_versions`.
- Private-open import/change scripts now populate deadline trace fields for each generated version.
- `node scripts/platform/import-open-funders.mjs` dry-run reports 12 sources and 4 open/active without applying changes.
- `node scripts/platform/detect-open-funder-changes.mjs --simulate-deadline-change` dry-run reports 1 critical deadline change and 11 unchanged sources.
- Mini BDNS run generated 1 public opportunity with `deadlineObserved`, `deadlineEvidenceUrl`, `deadlineEvidenceDate`, `deadlineReadAt`, `deadlineNextReviewAt`, `deadlineUncertaintyReason`, and `tenantAlarmPolicy`.
- `npm run platform:import-bdns-radar` dry-run reads the current 30-opportunity BDNS corpus without applying changes.
- `npm run platform:import-bdns-radar -- --input=.tmp\deadline-trace-bdns\bdns-search.json` dry-run reads the enriched one-opportunity BDNS corpus.
- Full BDNS search run on 2026-07-02 generated 572/572 public opportunities with 0 detail errors, 329 structured deadlines, 228 uncertain deadlines, and no missing deadline trace fields.
- UI headless check with the full corpus shows 572/572 public BDNS loaded and 15 visible paginated rows with deadline trace cells.
- Preflight check confirmed `npm run platform:import-bdns-radar -- --apply=true --input=.tmp\deadline-trace-bdns\bdns-search.json` stops before writing when the deadline trace migration is absent.
- `npx supabase db push` applied `20260702110000_deadline_trace_fields.sql` to the linked remote Supabase project.
- `npm run platform:import-bdns-radar -- --apply=true` imported 572 BDNS public opportunities with traced current versions.
- Re-running `npm run platform:import-bdns-radar -- --apply=true` refreshed 572 existing versions and created 0 duplicates/new versions.
- `npm run platform:import-open-funders -- --apply` updated/imported 12 private-open curated opportunities with traced current versions.
- Remote Supabase check: 572 current `platform_public` versions, 12 current `platform_curated` versions, and 0 current versions missing `deadline_observed`, `tenant_alarm_policy`, or `deadline_read_at`.
- `npm run platform:seed-demo-watch -- --apply` ensures Novaterra demo watches the La Caixa curated opportunity.
- `npm run platform:run-alert-e2e -- --apply` creates a controlled critical deadline event, generates 1 tenant alert for Novaterra, marks it resolved, and cleans the test artifacts.
- `npm run check:stability` passes.

## Residual Risk

The current production-like corpus has traced public and private-open versions, and the controlled alert pipeline works. Real external channel delivery such as Teams, WhatsApp, or email remains future work; in-app alerts and safe summaries are covered.
