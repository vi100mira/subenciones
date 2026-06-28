# Stitch Visual Integration - 2026-06-28

## Changed

- Integrated the Google Stitch visual proposal as a local theme layer instead of replacing product logic.
- Added `prototype/stitch-theme.css` with the Stitch-inspired institutional palette, surfaces, buttons, sidebar, source-map states, and card treatment.
- Updated the public entry screen to match the Stitch access concept: institutional privacy panel on the left, credential access and onboarding request on the right.
- Added local visual assets derived from the Stitch package: product logo and grant-management illustration.

## Preserved

- Existing credential demo accounts and role routing.
- Public onboarding API behavior.
- Supabase demo tenant reads.
- Guardrails for no direct role buttons, visible credential gate, hidden cockpit before access, and no visible secret patterns.

## Verification

- `npm run check:stability`
- `npm run check:ui`
- `npm run check:e2e:onboarding` in read-only mode
- Browser check on `http://localhost:5174/?v=public-entry#view-welcome` confirmed the new landing, loaded logo/assets, visible credential gate, visible onboarding form, and hidden cockpit before access.
