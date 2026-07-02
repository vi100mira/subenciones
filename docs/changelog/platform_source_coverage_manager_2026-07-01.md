# Platform Source Coverage Manager - 2026-07-01

## Intent

Add a superadmin-friendly way to manage and expand territorial and private-open source coverage, keeping it separate from tenant-private data.

Refined after review so source validation, connector readiness and human-review doubts are separate concepts. Manual source intake is now optional rather than the main path.

## Files Touched

- `prototype/platform-source-manager.js`
- `prototype/stitch-theme.css`
- `prototype/index.html`
- `docs/architecture/source-coverage-management.md`

## Verification

- `npm run check:stability`
- Browser check at `http://127.0.0.1:4183/?cache=source-coverage#view-platform`
- Verified `Fuentes` tab renders 4 coverage cards, 8 source cards, 4 expansion campaigns and a working guided analysis action.
- Refined source states at `http://127.0.0.1:4183/?cache=source-activation-2#view-platform`: optional intake remains collapsed, DOGV/BOP show `Fuente oficial` plus `Conector pendiente`, review queue exposes the concrete agent doubt.
- Checked mobile viewport width: no overflow detected in the source manager panel.

## Residual Risk

The manager is still prototype UI. It models the operating loop and review queue, but source persistence and real worker execution remain the next backend slice.
