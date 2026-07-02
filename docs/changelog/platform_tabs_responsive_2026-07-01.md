# Platform Tabs Responsive - 2026-07-01

## Intent

Prevent the platform submenu from wrapping awkwardly now that it has four tabs.

## Files Touched

- `prototype/stitch-theme.css`
- `prototype/index.html`

## Verification

- `npm run check:stability`
- Browser check at `http://127.0.0.1:4183/?cache=platform-tabs-2#view-platform` with 390px viewport: platform tabs stay on one row, no overflow, no horizontal scroll, and `Fuentes` remains visible.

## Residual Risk

The change is scoped to the platform submenu. Other segmented controls keep their existing grid behaviour.
