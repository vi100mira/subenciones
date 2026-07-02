# Remove Test Tenant - 2026-07-01

## Intent

Keep the platform tenant list honest by showing only the Novaterra pilot tenant instead of a simulated test entity.

## Files Touched

- `prototype/mock-data.js`
- `prototype/index.html`

## Verification

- `npm run check:stability`
- Browser check at `http://127.0.0.1:4183/?cache=novaterra-only#view-platform`
- Verified Plataforma > Entidades shows 1 tenant, `Novaterra`, and no `Entidad de prueba`.

## Residual Risk

The list is still prototype data. Production should read tenants from Supabase.
