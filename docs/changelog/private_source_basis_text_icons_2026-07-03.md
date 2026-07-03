# Private Source Basis And Text Icons - 2026-07-03

## Intent

Separate the action concepts shown in the opportunity grid: public official API is not the same as private funder bases, while private open opportunities can still expose located bases and captured source text.

## Files Touched

- `prototype/private-radar-data.js`
- `prototype/ui-polish.js`
- `prototype/opportunity-actions.js`

## Verification

- `npm run check:stability` passes.
- Rendered grid check found the Fundacion Iberdrola private row with actions `Ver`, `Bases/convocatoria privada`, and `Texto fuente privada usado`.
- Rendered grid check confirmed that the private row does not expose `API oficial`.
- Follow-up: private seed rows now expose compact program characteristics in the grid and detail modal even when their bases are still pending capture.

## Residual Risk

Only the Iberdrola private row has located bases/source text in this pass. Other private funders now show program characteristics, but still remain editorial candidates until their bases/source text are captured and reviewed.
