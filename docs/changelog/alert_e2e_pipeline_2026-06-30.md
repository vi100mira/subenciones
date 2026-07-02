# Alert E2E Pipeline - 2026-06-30

## Intent

Add a controlled end-to-end verification for tenant change alerts. The runner creates a marked platform change event, invokes the existing tenant alert worker, verifies that a tenant-scoped alert is created, resolves it, and removes only the test event and alert artifacts.

## Files Touched

- `scripts/platform/run-alert-e2e.mjs`
- `package.json`

## Verification

- `npm run platform:run-alert-e2e` found the `novaterra-demo` tenant, the Fundacion la Caixa opportunity, one active watch, and 0 pending events without writing data.
- `npm run check:stability` passed.
- `npm run platform:run-alert-e2e -- --apply` created 1 marked test change event, invoked the real alert worker, produced 1 tenant alert, resolved it, and cleaned the test event and alert.
- A final Supabase read showed 0 `platform_opportunity_change_events`, 0 `tenant_change_alerts`, and 1 active tenant watch.

## Residual Risks

- The e2e runner intentionally stops if there are real pending platform change events, because the current worker processes the pending queue globally.
