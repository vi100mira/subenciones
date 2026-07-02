# Platform Operations Global - 2026-07-01

## Intent

Reframe Operations as a superadmin/platform cockpit instead of a tenant-active dashboard.

## Files Touched

- `prototype/operations-platform.js`
- `prototype/index.html`

## Verification

- `npm run check:stability`
- Browser check at `http://127.0.0.1:4183/?cache=platform-ops#view-operations`
- Verified metrics are global: corpus platform, private-open coverage, human review and real AI cost today.
- Verified old tenant-centered mock entries such as private demo folders and SharePoint are no longer shown as operational center.

## Residual Risk

The panel uses current prototype coverage data. Productive persistence still requires Supabase reads for runs, costs, source health, worker queues and storage metrics.
