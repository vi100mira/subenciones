# AI Cadence Cost Policy - 2026-06-30

## Intent

Record and surface the operating decision that platform source monitoring should not become a continuous AI consumer. Campaigns use cheap deterministic detection first, then AI only when changed evidence needs interpretation, capped at daily by default.

## Files Touched

- `docs/architecture/change-detection-and-tenant-alerts.md`
- `docs/architecture/private-funder-radar-loop.md`
- `docs/architecture/public-radar-loop.md`
- `docs/product/mvp-execution-plan.md`
- `docs/product/master-context.md`
- `prototype/app.js`
- `prototype/mock-data.js`
- `prototype/ux-actions.js`

## Verification

- `npm run check:stability` passed.
- Browser verification for `#view-platform` showed the platform note: lightweight detection first, AI only for changed evidence, daily cap per campaign, and audited manual execution.
- Browser verification for `#view-operations` showed `Politica coste IA radar` with daily AI cap and hash/etag detection first.
- Browser verification confirmed direct hash navigation to operations selects the correct screen and has no console errors.

## Residual Risks

- The prototype now communicates the policy, but real enforcement needs persisted campaign config, scheduler limits, cost accounting, and audit events.
