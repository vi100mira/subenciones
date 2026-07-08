# Dashboard density - 2026-07-08

## Intent

Reduce visual saturation on the Panel screen by removing explanatory/demo blocks that do not represent live operational state.

## Files touched

- `prototype/visual-flows.js`: removes the dashboard visual-flow guide.
- `prototype/index.html`: removes the demo analysis panel and updates cache-busters for edited modules.
- `prototype/app.js`: stops injecting the explanatory note under the source map.

## Verification

- `node --check prototype/app.js`
- `node --check prototype/visual-flows.js`
- `npm run check:line-budgets`
- Playwright local check against `http://127.0.0.1:3000/index.html?v=20260708-lean-dashboard`:
  - Panel renders zero visual-flow panels.
  - Demo analysis and explanatory source-map note are absent.
  - Metrics, source map, Candidatura modal trigger, and Oportunidades inline guide still render.
- Screenshot saved at `docs/changelog/dashboard-lean-2026-07-08.png`.

## Residual risks

- This is a prototype display cleanup only. It does not change opportunity counts, source map data, tenant isolation, or backend behavior.
