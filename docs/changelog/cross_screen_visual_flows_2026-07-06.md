# Cross-screen visual flows - 2026-07-06

## Intent

Reduce cognitive load across the prototype by adding compact icon-based process guides with tooltips on the main tenant and platform screens.

## Files touched

- `prototype/visual-flows.js`: new reusable visual-flow layer for Dashboard, Oportunidades, Entidad, Candidatura, Auditoria and Operaciones.
- `prototype/visual-flows.js`: removes the Asistentes visual flow after review because that screen already exposes permissions and states in its cards, and the extra guide increased saturation.
- `prototype/visual-flows.js`: moves the Candidatura visual flow out of the main page into a compact `Guia visual` trigger that opens a modal with the structured graph.
- `prototype/visual-flows.js`: removes the Auditoria visual flow because the screen already exposes traceability through concrete session events and export controls.
- `prototype/index.html`: loads the new visual-flow layer after existing screen modules.

## Verification

- `node --check prototype/visual-flows.js`
- `npm run check:line-budgets`
- Playwright local check against `http://127.0.0.1:4173/index.html?v=20260706-cross-screen-flows`:
  - Dashboard, Oportunidades, Entidad, Candidatura, Auditoria and Operaciones each render one visual-flow panel.
  - Each checked panel renders four Lucide icons and tooltip-bearing controls.
  - Operations screenshot saved at `docs/changelog/cross-screen-visual-flows-2026-07-06.png`.
- Additional Playwright check:
  - Asistentes intentionally renders no visual-flow panel.
  - Platform Normalizacion still changes a source to `Fuente normalizada` and persists the normalized source in localStorage.
- Playwright local check against `http://127.0.0.1:3000/index.html?v=20260708-no-agents-flow`:
  - Asistentes renders zero visual-flow panels and keeps the prototype state block.
  - Oportunidades still renders one visual-flow panel with four icons.
- Screenshot saved at `docs/changelog/agents-without-visual-flow-2026-07-08.png`.
- Playwright local check against `http://127.0.0.1:3000/index.html?v=20260708-workspace-flow-modal`:
  - Candidatura renders no inline visual-flow panel, only one `Guia visual` trigger.
  - The trigger opens a modal with the four-step candidature graph and closes cleanly.
  - Oportunidades still keeps its inline visual-flow panel.
- Screenshot saved at `docs/changelog/workspace-visual-flow-modal-2026-07-08.png`.
- Playwright local check against `http://127.0.0.1:3000/index.html?v=20260708-no-audit-flow`:
  - Auditoria renders zero visual-flow panels and keeps its real session events.
  - Candidatura keeps one `Guia visual` trigger and its four-step modal.
  - Oportunidades still keeps its inline visual-flow panel.
- Screenshot saved at `docs/changelog/audit-without-visual-flow-2026-07-08.png`.

## Residual risks

- This is a prototype UI layer. It does not replace deeper redesign work for every dense panel, but gives each screen a clearer first-read orientation.
