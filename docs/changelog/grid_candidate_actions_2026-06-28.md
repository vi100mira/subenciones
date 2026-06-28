# Grid Candidate Actions - 2026-06-28

## Intent

Connect the Opportunities grid to the Candidature workspace so users understand how an opportunity becomes preselected or active.

## Files Touched

- `prototype/ui-polish.js`: adds a Candidature column with `Preseleccionar`, `Activar`, and `Abrir` actions persisted in local storage.
- `prototype/workspace-flow.js`: reads the same candidate selection state and rerenders when grid actions change it.
- `prototype/stitch-theme.css`: styles candidate actions and keeps the opportunity controls/table header sticky while scrolling.
- `prototype/index.html`: bumps asset versions.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=grid-candidates#view-opportunities`: confirmed `Candidatura` column, `Preseleccionar`, `Activar`, and `Abrir` actions, 1 active candidate in Workspace, and 4 tracked candidates.
- Playwright on `http://localhost:5174/?v=grid-candidates-2#view-opportunities`: confirmed grid has its own vertical scroll and the table header stays visible while scrolling rows.

## Residual Risks

- Candidate state is local prototype state. Production should persist preselection, activation, actor, timestamp, and audit reason per tenant.
