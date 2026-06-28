# Workspace Preselection Flow - 2026-06-28

## Intent

Clarify that the candidature workspace is not an automatic single decision. Opportunities can be preselected for comparison, and only one active candidature drives checklist and draft preparation at a time.

## Files Touched

- `prototype/workspace-flow.js`: replaces the static workspace with a preselection list, active candidature, and modal inspection action.
- `prototype/stitch-theme.css`: styles the candidature preselection list.
- `prototype/index.html`: loads the workspace flow module and bumps asset versions.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- Playwright on `http://localhost:5174/?v=workspace-flow#view-workspace`: confirmed 4 preselected candidates, 1 active candidature, explanatory note, 5 checklist items, and `Ver` opens the analysis modal.

## Residual Risks

- Prototype preselection is deterministic from loaded radar data. Production should store preselection, active candidature, status, owner, and audit events per tenant/user.
