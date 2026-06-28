# Radar Donut Filter - 2026-06-28

## Intent

Make the entity radar status easier to understand and interact with by replacing the passive filter note with a clickable distribution chart.

## Files Touched

- `prototype/ui-polish.js`: adds radar scope state, renders active/discarded/archived opportunity sets, and wires chart/legend clicks to the grid.
- `prototype/stitch-theme.css`: styles the compact donut, legend, sticky spacing, and responsive layout.
- `prototype/index.html`: bumps asset versions so the browser loads the new UI.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=radar-donut-3#view-opportunities`: confirmed default active scope has 13 rows, chart has 3 clickable zones, discarded scope shows 10 non-candidate rows, and archived scope shows 7 archived rows without activation actions.

## Residual Risks

- The active/discarded/archived split is still client-side prototype logic. Production should apply the same tenant-aware scope in backend queries and audit why an opportunity was discarded or archived.
