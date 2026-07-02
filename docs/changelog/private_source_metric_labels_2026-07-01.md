# Private Source Metric Labels - 2026-07-01

## Intent

Clarify the superadmin private metric. `6/12` was being read as private opportunities, but it meant active/open private sources out of reviewed private sources.

## Files Touched

- `prototype/ui-polish.js`
- `prototype/stitch-theme.css`
- `prototype/opportunity-actions.js`
- `prototype/index.html`

## Verification

- `npm run check:stability` passed.
- Browser check at `http://127.0.0.1:4183/?cache=private-source-labels#view-opportunities` confirmed the platform metric now separates `12 Fuentes privadas` from `6 activas/open`.
- The `Privadas` filter note now states `20 oportunidades cargadas desde fuentes privadas abiertas y catalogo curado de plataforma`, and pagination shows `1-15 de 20 filas cargadas`.
- Browser console error check returned no errors.

## Residual Risks

- Counts are still prototype coverage metrics. Real private-open coverage needs a source registry worker and evidence-backed scraping/monitoring before claiming market completeness.
