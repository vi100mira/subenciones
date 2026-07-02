# Prototype Watch Actions - 2026-06-30

## Intent

Connect the prototype candidate action to the tenant watch concept. Creating a candidature now also records that the tenant should follow the opportunity for future deadline or criteria changes.

## Files Touched

- `prototype/watch-actions.js`
- `prototype/app.js`
- `prototype/index.html`
- `prototype/mock-data.js`

## Verification

- `npm run check:stability` passed.
- Browser loaded the prototype with `watch-actions.js` included and no JavaScript console errors observed before interaction.
- Static wiring check confirmed the script include, `data-watch-opportunity` button attribute, `candidate_workspace` reason, La Caixa canonical key, local demo storage key, and `/api/tenant-opportunity-watches` endpoint target.
- Direct click automation was limited by the browser runtime reporting no clickable bounding box for the offscreen detail action; this is a verification limitation, not a runtime console error.

## Residual Risks

- Browser API calls require a future authenticated tenant session. Without `DEMO_AUTH_TOKEN` and `DEMO_TENANT_ID`, the prototype stores the watch locally as demo state.
