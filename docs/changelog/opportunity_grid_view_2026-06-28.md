# Opportunity Grid View - 2026-06-28

## Intent

Add a dense grid view for opportunity comparison without replacing the existing card/detail review flow.
Make filtering and sorting explicit enough for non-technical users.
Move grid sorting into the table headers to reduce toolbar height and match standard data-table behavior.

## Files Touched

- `prototype/ui-polish.js`: adds the Cards/Grid switch, local search, sortable grid headers with arrow icons, and row selection wired to the existing opportunity detail state.
- `prototype/stitch-theme.css`: styles the grid, search control, selected row, and contained horizontal overflow.
- `prototype/index.html`: bumps static asset versions so the browser loads the new polish files.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=grid-check-3#view-opportunities`: switched to Grid, searched "deportes", sorted by deadline, selected a row, and confirmed the analysis panel updated.
- Playwright on `http://localhost:5174/?v=grid-controls#view-opportunities`: confirmed visible "Filtrar" and "Vista" controls plus sortable grid behavior.
- Playwright on `http://localhost:5174/?v=grid-head-sort#view-opportunities`: confirmed sorting controls moved into table headers, each sortable header has an arrow icon, and repeated clicks toggle `aria-sort`.

## Residual Risks

- Grid sorting/search are client-side only in the prototype. A backend version should move filtering, paging, and exports behind tenant-aware API policies.
