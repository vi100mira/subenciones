# Governance To Policy Footer - 2026-06-28

## Intent

Remove the confusing Governance workspace from primary navigation and present data rules as product policies instead of simulated operations.

## Files Touched

- `prototype/index.html`: removes Governance from the sidebar and adds a footer link to policies.
- `prototype/app.js`: redirects old `view-governance` routes to Entity and changes opportunity detail action to open policies.
- `prototype/ux-actions.js`: adds the policies modal.
- `prototype/stitch-theme.css`: styles the footer policy link and modal policy list.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=policy-footer#view-governance`: confirmed old governance hash redirects to Entity, sidebar no longer shows Governance, footer exposes `Politicas y normas`, and the modal opens with 5 policy blocks.

## Residual Risks

- The old Governance DOM remains in the prototype for now but is no longer reachable from primary navigation or old hashes. Product docs still keep governance requirements for backend implementation.
