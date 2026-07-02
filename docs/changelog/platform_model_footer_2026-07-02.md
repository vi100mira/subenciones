# Platform Model Footer - 2026-07-02

## Intent

Remove the non-interactive `Modelo` submenu from `Plataforma` and move the operating model explanation into the footer policy document.

## Files Touched

- `prototype/index.html`
- `prototype/app.js`
- `prototype/public-entry.js`
- `prototype/audit-runtime.js`
- `prototype/ux-actions.js`

## Verification

- `npm run check:stability` passes.
- Browser verification confirmed the platform submenu no longer shows `Modelo`; `Fuentes` still installs as an operational tab.
- Footer now opens `Politicas y modelo`, including the separation rule for platform-public/open-private sources versus tenant-private sources.
- Follow-up UI copy: the global platform action is now `Ejecutar ahora` for manual agent execution. The action inside `Revisiones` is now `Programar revision`, reserved for cadence, budget and source configuration.
- Repository search confirms the old labels `Nueva revision` and `Lanzar revision` are no longer present in `prototype/`.

## Residual Risk

The footer modal is still prototype UI. A production version should link to versioned policy documents and persist policy acceptance/audit events per tenant.
