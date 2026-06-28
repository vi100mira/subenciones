# Entity Territory Fit - 2026-06-28

## Intent

Prevent the public radar from presenting out-of-territory BDNS calls as normal candidates for the active entity profile.

## Files Touched

- `prototype/entity-fit.js`: annotates BDNS opportunities against the current demo tenant context and removes out-of-scope territories from the active radar list.
- `prototype/index.html`: loads entity-fit before the main app render.
- `prototype/ui-polish.js`: shows a visible entity-fit note with candidate and discarded counts.
- `docs/product/agentic-architecture.md`: specifies that the Match Agent must load tenant profile context before ranking opportunities.

## Verification

- Node data check: 20 visible candidates and 10 discarded opportunities after applying the entity territory rule.
- Playwright on `http://localhost:5174/?v=territory-fit#view-opportunities`: confirmed the note is visible, grid has 20 rows, dashboard metric is 20, and Huelva/Cadiz/Teruel/Aragon do not appear in the active view.
- `npm run check:stability`
- `npm run check:ui`

## Residual Risks

- Prototype filtering is client-side. Production must apply the same tenant-aware rule in the backend query/ranking path and preserve discarded-opportunity audit events.
