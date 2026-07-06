# Platform source normalization UI - 2026-07-06

## Intent

Clarify that private-open funder variability is handled from Superadmin as source normalization before tenant-facing opportunities are published.

## Files touched

- `prototype/platform-source-manager.js`: adds a Normalizacion platform tab with method steps, private-source normalization states, basis evidence status, and tenant output rules.
- `prototype/platform-source-manager.js`: adds a per-source Normalizar action that opens a guided normalization card with the source, official-entry check, basis evidence check, operational state, and required human decision.
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
- Screenshot saved at `docs/changelog/platform-source-normalization-ui-2026-07-06.png`.

## Residual risks

- The screen is still prototype-only mock UI. Production needs persisted source normalization records, reviewer decisions, and source-health history before autonomous use.
