# Cross-screen visual flows - 2026-07-06

## Intent

Reduce cognitive load across the prototype by adding compact icon-based process guides with tooltips on the main tenant and platform screens.

## Files touched

- `prototype/visual-flows.js`: new reusable visual-flow layer for Dashboard, Oportunidades, Entidad, Asistentes, Candidatura, Auditoria and Operaciones.
- `prototype/index.html`: loads the new visual-flow layer after existing screen modules.

## Verification

- `node --check prototype/visual-flows.js`
- `npm run check:line-budgets`
- Playwright local check against `http://127.0.0.1:4173/index.html?v=20260706-cross-screen-flows`:
  - Dashboard, Oportunidades, Entidad, Candidatura, Auditoria and Operaciones each render one visual-flow panel.
  - Each checked panel renders four Lucide icons and tooltip-bearing controls.
  - Operations screenshot saved at `docs/changelog/cross-screen-visual-flows-2026-07-06.png`.
- Additional Playwright check:
  - Asistentes renders one visual-flow panel with four icons and tooltips.
  - Platform Normalizacion still changes a source to `Fuente normalizada` and persists the normalized source in localStorage.

## Residual risks

- This is a prototype UI layer. It does not replace deeper redesign work for every dense panel, but gives each screen a clearer first-read orientation.
