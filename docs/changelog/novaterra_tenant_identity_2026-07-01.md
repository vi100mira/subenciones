# Novaterra Tenant Identity - 2026-07-01

## Intent

Clarify who Novaterra is in the platform tenant list: the pilot tenant, not a product-wide assumption.

## Files Touched

- `prototype/mock-data.js`
- `prototype/index.html`
- `prototype/app.js`

## Verification

- `npm run check:stability`
- Browser check at `http://127.0.0.1:4183/?cache=novaterra-tenant#view-platform`
- Verified Plataforma > Entidades shows `Novaterra` as active pilot tenant and `Entidad de prueba` as simulated onboarding data.

## Residual Risk

The tenant list is still prototype data. Production must read tenant identity and onboarding status from Supabase.
