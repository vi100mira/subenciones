# Opportunity Grid View - 2026-06-28

## Intent

Add a dense grid view for opportunity comparison without replacing the existing card/detail review flow.
Make filtering and sorting explicit enough for non-technical users.

## Files Touched

- `prototype/ui-polish.js`: adds the Cards/Grid switch, local search, sortable grid headers, and row selection wired to the existing opportunity detail state.
- `prototype/stitch-theme.css`: styles the grid, search control, selected row, and contained horizontal overflow.
- `prototype/index.html`: bumps static asset versions so the browser loads the new polish files.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=grid-check-3#view-opportunities`: switched to Grid, searched "deportes", sorted by deadline, selected a row, and confirmed the analysis panel updated.
- Playwright on `http://localhost:5174/?v=grid-controls#view-opportunities`: confirmed visible "Filtrar", "Vista", "Ordenar por", direction toggle, and active `asc/desc` sort marker.

## Residual Risks

- Grid sorting/search are client-side only in the prototype. A backend version should move filtering, paging, and exports behind tenant-aware API policies.
