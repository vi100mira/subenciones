# Layout Polish, Sidebar Collapse, and Footer - 2026-06-28

## Changed

- Added a collapsible sidebar with persisted local preference.
- Added a compact app footer with product trust boundaries: public radar, private data by consent, and no automatic submission without human review.
- Improved mid-width responsive behavior so opportunity analysis, governance panels, and candidature panels stack before they become cramped.
- Converted candidature checklist action buttons into icon buttons with accessible labels and hover tooltips.
- Tightened governance/source rows to avoid overlap while preserving dense operational layout.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Browser checks on governance, candidature, opportunities, and collapsed sidebar at `http://localhost:5174`.
