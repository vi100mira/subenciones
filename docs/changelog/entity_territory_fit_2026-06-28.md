# Entity Territory Fit - 2026-06-28

## Intent

Prevent the public radar from presenting out-of-territory or closed BDNS calls as normal candidates for the active entity profile.

## Files Touched

- `prototype/entity-fit.js`: annotates BDNS opportunities against the current demo tenant context and removes out-of-scope territories and closed calls from the active radar list.
- `prototype/index.html`: loads entity-fit before the main app render.
- `prototype/ui-polish.js`: shows a visible entity-fit note with candidate and discarded counts.
- `docs/product/agentic-architecture.md`: specifies that the Match Agent must load tenant profile context before ranking opportunities.

## Verification

- Node data check: 13 visible candidates, 10 territory-discarded opportunities, and 7 closed archived opportunities after applying the entity fit rule.
- Playwright on `http://localhost:5174/?v=deadline-fit#view-opportunities`: confirmed the note is visible, grid has 13 rows, dashboard metric is 13, and closed calls do not appear in the active view.
- `npm run check:stability`
- `npm run check:ui`

## Residual Risks

- Prototype filtering is client-side. Production must apply the same tenant-aware rule in the backend query/ranking path and preserve discarded-opportunity audit events.
