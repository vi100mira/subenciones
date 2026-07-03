# Opportunity Grid Column Filters - 2026-07-03

## Intent

Add operational per-column filtering to the opportunity grid so users can type inside each header concept and also pick from available values. `Acciones` remains unfiltered.

Follow-up: make suggested options depend on the other active column filters, so the UI does not offer combinations that look valid but collapse the grid to zero rows. Add an explicit clear-filters action.

## Files Touched

- `prototype/ui-polish.js`
- `prototype/grid-filters.css`
- `prototype/index.html`

## Verification

- `npm run check:stability` passes.
- Rendered grid check confirms 7 column filters and 0 filters under `Acciones`.
- Rendered grid check confirms datalist options are generated for filtered columns.
- Rendered grid check confirms filtering by source, status, and territory reduces rows and updates pagination.
- Visual screenshot check confirms the filter row renders as a compact table header row.
- Follow-up rendered local check confirms `BDNS/SNPSAP` no longer offers `Accion social` as a suggested `Ambito` option when incompatible.
- Follow-up rendered local check confirms manual zero-result combinations show `Limpiar filtros` and clearing restores the 592-row grid.
- Follow-up rendered tenant check confirms the 191 live rows include 171 public `BDNS/SNPSAP` rows; filtering `BDNS/SNPSAP` + `Accion social` now returns 107 public rows instead of zero by treating `Servicios Sociales y Promoción Social` as the same operational area.

## Residual Risk

Filters are client-side prototype behavior over currently loaded rows. They do not persist user preferences and do not change backend retrieval, tenant isolation, or evidence handling. They now avoid most invalid combinations through dependent suggestions, but manually typed text can still produce zero rows and is recoverable through `Limpiar filtros`.
