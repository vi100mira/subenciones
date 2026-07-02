# Dashboard Truthful States - 2026-07-01

## Intent

Make the dashboard explicit about what is functional, partial, seeded, or not connected yet.

## Files Touched

- `prototype/index.html`
- `prototype/app.js`
- `prototype/mock-data.js`

## Verification

- `npm run check:stability`
- Browser check at `http://127.0.0.1:4183/?cache=dashboard-truth-2#view-dashboard`
- Verified the focus card says `Muestra de analisis` and `No es alerta real`.
- Verified source map labels show `Operativa parcial`, `Fuente validada`, `Monitor activo`, `Conector pendiente`, `Catalogo semilla`, `No conectada`, and `Bloqueada`.

## Residual Risk

The dashboard still contains a sample analysis card until tenant-specific scoring is generated from persisted profile data.
