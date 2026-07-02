# Platform Private Opportunities Visibility - 2026-06-30

## Intent

Ensure the superadmin opportunities view shows the platform corpus, not only the BDNS radar sample. Public radar rows must be combined with private-open and curated mock opportunities when the BDNS fixture is active.

## Files Touched

- `prototype/opportunity-actions.js`
- `prototype/ui-polish.js`
- `prototype/index.html`

## Verification

- `npm run check:stability` passed.
- Browser verification showed 15 total opportunity rows when BDNS is active, including platform private-open opportunities.
- Browser verification showed the `Privadas` filter returns `Fundacion privada` and `Obra social bancaria` rows.
- Browser verification confirmed tenant-private mock rows are not shown in the superadmin platform corpus.

## Residual Risks

- Tenant-private opportunity rows in the prototype are labels/mock metadata. Production must not expose tenant-private evidence across tenants without explicit policy.
