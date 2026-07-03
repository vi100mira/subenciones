# Opportunity Grid Candidate Status Sort - 2026-07-03

## Intent

Make `Candidatura` and `Estado` sortable like the rest of the opportunity grid headers, preserving the compact operational table pattern.

## Files Touched

- `prototype/ui-polish.js`

## Verification

- `npm run check:stability` passes.
- Rendered grid check confirms `Candidatura` and `Estado` expose `data-grid-sort` buttons.
- Rendered grid check confirms clicking each header updates `aria-sort` and reorders the first visible row/status.

## Residual Risk

Sort order uses the current visible operational labels and local candidate/document state. It does not change backend data, tenant isolation, or recommendation evidence.
