# Logo Picker UI - 2026-07-01

## Intent

Replace the native file input in tenant onboarding with a branded, readable logo upload control.

## Files Touched

- `prototype/app.js`
- `prototype/stitch-theme.css`
- `prototype/ux-actions.js`
- `prototype/index.html`

## Verification

- `npm run check:stability`
- Browser check at `http://127.0.0.1:4183/?cache=logo-picker#view-platform`
- Verified the native file input is hidden behind a styled `Subir logo` control, keeps `image/*` accept, shows `Sin archivo`, and does not overflow the form.

## Residual Risk

The control is visual/prototype only. Real logo upload still needs backend storage, validation, virus scanning and tenant-scoped Blob path.
