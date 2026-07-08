# Entity profile density - 2026-07-08

## Intent

Reduce visual saturation in the Entidad screen so it shows the real contracted assistant state without repeating tool internals, context-permission guides, or follow-up panels.

## Files touched

- `prototype/entity-activation.js`: removes the tools-by-assistant block, context-permission blocks, and improvement-next-steps panel from the activated entity view.
- `prototype/visual-flows.js`: removes the Entidad visual-flow guide because the remaining services panel already communicates status.
- `prototype/index.html`: updates cache-busters for the edited prototype modules.

## Verification

- `node --check prototype/entity-activation.js`
- `node --check prototype/visual-flows.js`
- `npm run check:line-budgets`
- Playwright local check against `http://127.0.0.1:3000/index.html?v=20260708-lean-entity`:
  - Entidad renders zero visual-flow panels and keeps the contracted-services state.
  - Removed tools, IA information, context-permission, and next-step panels are absent.
  - Candidatura keeps one `Guia visual` trigger and its four-step modal.
  - Oportunidades still keeps its inline visual-flow panel.
- Screenshot saved at `docs/changelog/entity-profile-lean-2026-07-08.png`.

## Residual risks

- This is a prototype display cleanup only. It does not change tenant permissions, backend policy, or source access.
