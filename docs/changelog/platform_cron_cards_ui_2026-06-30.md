# Platform Cron Cards UI - 2026-06-30

## Intent

Make the superadmin platform screen easier to operate: review campaigns must be visible before tenant administration, and each campaign must expose cron expression, AI cost policy, manual execution, and budget controls.

## Files Touched

- `prototype/index.html`
- `prototype/app.js`
- `prototype/mock-data.js`
- `prototype/ux-actions.js`

## Verification

- `npm run check:stability` passed.
- Browser verification showed `Revisiones de plataforma` as the first platform panel, function cards for `Detectar cambios`, `Programar cron`, and `Ejecutar ahora`, plus 3 campaign cards, cron inputs for each campaign, 3 `Guardar cron` buttons, and 3 `Ejecutar ahora` buttons.

## Residual Risks

- Cron inputs are prototype controls only. Real implementation still needs validation, persistence, scheduler integration, audit events, and permission checks.
