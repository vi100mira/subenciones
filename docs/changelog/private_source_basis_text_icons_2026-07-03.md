# Private Source Basis And Text Icons - 2026-07-03

## Intent

Separate the action concepts shown in the opportunity grid: public official API is not the same as private funder bases, while private open opportunities can still expose located bases and captured source text.

Follow-up pass: enrich every private seed opportunity with a reviewed public/private source URL, source-text summary, evidence note, and program characteristics so all private rows expose the same evidence actions.

## Files Touched

- `prototype/private-radar-data.js`
- `prototype/ui-polish.js`
- `prototype/opportunity-actions.js`

## Verification

- `npm run check:stability` passes.
- Rendered grid check found the Fundacion Iberdrola private row with actions `Ver`, `Bases/convocatoria privada`, and `Texto fuente privada usado`.
- Rendered grid check confirmed that the private row does not expose `API oficial`.
- Follow-up: private seed rows now expose compact program characteristics in the grid and detail modal even when their bases are still pending capture.
- `PRIVATE_OPEN_OPPORTUNITIES` data check found 18 private rows, 0 missing bases/source text/program characteristics.
- Rendered pagination check found 18 private rows, 0 missing `Bases/convocatoria privada` or `Texto fuente privada usado`, and 0 private rows exposing `API oficial BDNS`.

## Residual Risk

The prototype now links all private rows to a plausible official or funder-controlled page. Some are program or partnership pages rather than live grant bases, so they still require editorial review before tenant-specific recommendation or submission work.
