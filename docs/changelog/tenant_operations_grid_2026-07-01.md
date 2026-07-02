# Tenant Operations Grid - 2026-07-01

## Intent

Replace the collapsible tenant row with an operational grid for superadmin actions.

## Files Touched

- `prototype/app.js`
- `prototype/ux-actions.js`
- `prototype/stitch-theme.css`
- `prototype/index.html`

## Verification

- `npm run check:stability`
- Browser check at `http://127.0.0.1:4183/?cache=tenant-ops-4#view-platform`
- Verified Plataforma > Entidades renders one Novaterra tenant row with Editar, Terminos, Suspender and Eliminar operations; no horizontal overflow at the current desktop viewport.
- Verified tenant operation buttons open explicit modals for edit, terms, suspension, and safe deletion request.

## Residual Risk

Actions are prototype UI only. Production must enforce permissions, confirmation, audit, retention and Supabase RLS before editing, suspending or deleting a tenant.
