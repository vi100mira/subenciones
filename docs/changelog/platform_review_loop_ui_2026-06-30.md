# Platform Review Loop UI - 2026-06-30

## Intent

Clarify that superadmin does not run tenant searches. The platform role manages iterative review campaigns over public and private-open sources, with cron cadence and manual execution using the same loop.

## Files Touched

- `prototype/index.html`
- `prototype/app.js`
- `prototype/mock-data.js`
- `prototype/ux-actions.js`

## Verification

- `npm run check:stability` passed.
- `node scripts/guardrails/check-line-budgets.mjs` passed with `prototype/index.html` at 420/420 and `prototype/app.js` at 360/360.
- Browser verification showed role `superadmin`, CTA `Lanzar revision`, platform campaigns `Radar publico estatal`, `Radar territorial CV`, and `Privadas abiertas`, with no console errors.
- Browser verification also showed the dashboard keeps CTA `Lanzar revision` when the active role is `superadmin`.

## Residual Risks

- This is still a prototype UI. Real cron scheduling and manual execution need a backend trigger with audit events.
