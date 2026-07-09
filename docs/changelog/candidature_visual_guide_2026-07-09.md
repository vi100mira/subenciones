# Candidature visual guide - 2026-07-09

## Intent

Replace the compact candidature guide with an integrated step-by-step visual guide, matching the supplied vertical timeline model and keeping human review visible before project activation or presentation.

## Files touched

- `prototype/workspace-flow.js`: renders the candidature workflow as a large integrated five-step guide above the candidate list.
- `prototype/workspace-flow.js`: adds a persisted collapse/expand control for the guide.
- `prototype/workspace-flow.js`: moves the guide toggle next to the explanatory text, highlights the active candidature title, and opens a compact active-candidature checklist modal from `Ver detalle`.
- `prototype/workspace-flow.js`: removes the low-value proposal draft block from the main candidature view.
- `prototype/app.js`: keeps workspace rendering tolerant when the proposal outline container is absent.
- `prototype/stitch-theme.css`: adds the vertical timeline, numbered controls, current-state badge, and supporting explanation blocks.
- `prototype/stitch-theme.css`: aligns guide title and step-number typography with the app font and styles the collapsed state.
- `prototype/stitch-theme.css`: styles the active candidature state and the new active-candidature modal.
- `prototype/visual-flows.js`: removes the old candidature visual-guide modal so the screen has one canonical guide.
- `prototype/index.html`: bumps static asset versions so the browser loads the updated guide.

## Verification

- `node --check prototype/workspace-flow.js`
- `node --check prototype/visual-flows.js`
- `npm run check:line-budgets`
- Playwright local authenticated check against `http://localhost:3000/?check=20260709-candidature-guide#view-workspace`:
  - Candidatura renders the integrated five-step guide.
  - The old workspace `Guia visual` modal trigger is absent.
  - The current stage badge renders as `En curso`.
  - Four candidature cards remain visible below the guide.
  - Screenshot saved at `docs/changelog/candidature-visual-guide-2026-07-09.png`.
- Mobile Playwright check at 390 px width:
  - Candidatura still renders five guide steps.
  - No guide text or controls report horizontal overflow.
- Follow-up Playwright check against `http://localhost:3000/?check=20260709-candidature-guide-toggle#view-workspace`:
  - `Plegar guia` hides timeline and supporting notes.
  - `Desplegar guia` restores the five-step timeline.
  - The collapsed preference persists in localStorage.
  - Heading and numbered steps use the same computed font family as the app.
  - Screenshot saved at `docs/changelog/candidature-visual-guide-toggle-2026-07-09.png`.
- Follow-up mobile Playwright check at 390 px width:
  - Collapsed guide keeps the `Desplegar guia` control visible.
  - No candidate-guide elements report horizontal overflow.
- Follow-up Playwright check against `http://localhost:3000/?check=20260709-candidature-active-modal#view-workspace`:
  - Collapsed `Desplegar guia` is positioned next to the guide copy.
  - The active candidature title renders in the app teal color.
  - `Ver detalle` opens a compact active-candidature modal with five checklist tasks.
  - The legacy inline documentary package is not injected from `Ver detalle`.
  - The proposal draft block is absent from the main candidature view.
  - Screenshot saved at `docs/changelog/candidature-active-modal-2026-07-09.png`.
  - Collapsed-state screenshot saved at `docs/changelog/candidature-collapsed-guide-2026-07-09.png`.
- Follow-up mobile Playwright check at 390 px width:
  - The active-candidature modal opens with five tasks.
  - Candidate guide and modal elements report no horizontal overflow.
- Follow-up correction after review against `http://localhost:3000/?check=20260709-opportunity-active-modal#view-opportunities`:
  - `prototype/ui-polish.js` now marks the active candidature directly in the Oportunidades table/list.
  - The visible active row title renders in teal and exposes `Ver detalle`.
  - `Ver detalle` opens the compact active-candidature checklist modal instead of the generic analysis modal.
  - The Oportunidades renderer refreshes when `workspace-candidates-changed` fires.
  - Screenshot saved at `docs/changelog/opportunity-active-modal-2026-07-09.png`.
- Follow-up workspace simplification against `http://localhost:3000/?check=20260709-workspace-no-duplicate-active#view-workspace`:
  - Removed the duplicated inline `Candidatura activa` checklist panel from the bottom of Candidatura.
  - The candidature tray remains visible with four cards.
  - `Ver detalle` still opens the compact modal with five tasks.
  - Screenshot saved at `docs/changelog/workspace-without-inline-active-2026-07-09.png`.
- Added a defensive CSS guard and cache-busted assets in `http://localhost:3000/?check=20260709-no-inline-active#view-workspace`:
  - `#workspace .workspace-flow > .workbench` is hidden if an older render inserts it.
  - Playwright confirms zero inline `Candidatura activa` headings inside `.workspace-flow`.
  - Screenshot saved at `docs/changelog/workspace-without-inline-active-guard-2026-07-09.png`.
- Tenant fit correction against `http://localhost:3000/?check=20260709-novaterra-web-fit-entity#view-opportunities`:
  - `prototype/entity-fit.js` now combines Novaterra web/profile signals with territory instead of filtering only by territory.
  - Novaterra tenant sees 64 live/revisable opportunities, with status evidence such as empleo, inclusion, formacion, vulnerabilidad or servicios sociales.
  - Private open opportunities are filtered by the same tenant fit unless the role is superadmin.
  - Superadmin still sees platform corpus/capacity: 594 loaded rows, and no longer displays tenant-specific Novaterra reasons in the status column.
  - Tenant screenshot saved at `docs/changelog/opportunities-entity-web-fit-2026-07-09.png`.
  - Superadmin screenshot saved at `docs/changelog/opportunities-superadmin-web-fit-2026-07-09.png`.

## Residual risks

- Prototype-only UI change; it does not change candidature state persistence, export behavior, or backend permissions.
