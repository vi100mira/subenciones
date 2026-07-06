# Platform source normalization UI - 2026-07-06

## Intent

Clarify that private-open funder variability is handled from Superadmin as source normalization before tenant-facing opportunities are published.

## Files touched

- `prototype/platform-source-manager.js`: adds a Normalizacion platform tab with method steps, private-source normalization states, basis evidence status, and tenant output rules.
- `prototype/platform-source-manager.js`: adds a per-source Normalizar action that opens a guided normalization card with the source, official-entry check, basis evidence check, operational state, and required human decision.
- `prototype/platform-source-manager.js`: makes the normalization action explicit as `Normalizar fuente` instead of the compact row action menu.
- `prototype/platform-source-manager.js`: replaces the long normalization page with internal tabs (`Flujo`, `Fuentes`, `Ficha`, `Revision`), an icon-based flow, tooltip titles, and a persisted `Fuente normalizada` state.
- `prototype/platform-source-manager.js`: changes `Revisar y normalizar` to open a human-review modal with required checks; the source is only marked `Fuente normalizada` after approving all checks.
- `prototype/platform-source-manager.js`: adds the post-normalization change-monitor agent to the normalized source detail.
- `prototype/index.html`: cache-busts the platform source manager script so the local browser loads the updated prototype.

## Verification

- `node --check prototype/platform-source-manager.js`
- `npm run check:line-budgets`
- Playwright local check against `http://127.0.0.1:4173/index.html?v=20260706-source-normalization-5#view-platform` with a superadmin session:
  - Normalizacion tab is active.
  - Method steps are visible.
  - Private-open rows include Fundacion la Caixa and Ford Espana.
  - Tenant guardrail text is visible.
- Playwright local check against `http://127.0.0.1:4173/index.html?v=20260706-source-normalization-guide#view-platform` with a superadmin session:
  - Five private-open `Normalizar` actions are visible.
  - Clicking Ford Espana opens its normalization detail.
  - The detail shows the official-entry step and the tenant publication guardrail.
- Updated screenshot saved at `docs/changelog/platform-source-normalization-guide-2026-07-06.png`.
- Playwright local check against `http://127.0.0.1:4173/index.html?v=20260706-source-normalization-action#view-platform`:
  - Five explicit `Normalizar fuente` buttons are visible.
  - No normalization action is rendered as `...`.
  - Ford Espana opens `Ficha de normalizacion abierta: Ford Espana`.
- Screenshot saved at `docs/changelog/platform-source-normalization-action-2026-07-06.png`.
- Playwright local check against `http://127.0.0.1:4173/index.html?v=20260706-source-normalization-flow#view-platform`:
  - Initial view opens on the visual `Flujo` pane with four icon steps and no source rows visible.
  - `Elegir fuente` opens the sources pane.
  - `Normalizar fuente` on Ford Espana persists it in localStorage and opens the `Ficha` pane.
  - The detail title reads `Fuente normalizada: Ford Espana`.
- Screenshot saved at `docs/changelog/platform-source-normalization-flow-2026-07-06.png`.
- Playwright local check against `http://127.0.0.1:4173/index.html?v=20260706-source-normalization-review#view-platform`:
  - `Revisar y normalizar` opens a modal titled `Normalizar Fundacion ONCE`.
  - The modal contains four required checks.
  - If one check is unchecked, approval is blocked and localStorage remains empty.
  - After approving all checks, the modal closes and the detail title reads `Fuente normalizada: Fundacion ONCE`.
  - The normalized detail shows `Monitor de cambios privados` and the rule `saltara una alerta revisable`.
- Screenshot saved at `docs/changelog/platform-source-normalization-review-2026-07-06.png`.
- Screenshot saved at `docs/changelog/platform-source-normalization-ui-2026-07-06.png`.

## Residual risks

- The screen is still prototype-only mock UI. Production needs persisted source normalization records, reviewer decisions, and source-health history before autonomous use.
