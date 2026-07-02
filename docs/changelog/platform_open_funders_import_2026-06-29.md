# Platform Open Funders Import - 2026-06-29

## Intent

Add a controlled platform script that imports the curated private-open funder catalogue into Supabase platform sources, canonical opportunities, and initial opportunity versions.

## Files Touched

- `scripts/platform/import-open-funders.mjs`
- `package.json`

## Verification

- `npm run platform:import-open-funders` dry-run reported 12 sources and 0 tenant-private sources.
- `npm run check:stability` passed.
- `npm run platform:import-open-funders -- --apply` imported the catalogue into the linked Supabase project.
- Read-only Supabase verification reported 12 `private_funder` platform sources, 12 `platform_curated` opportunities, and 12 current opportunity versions.

## Residual Risks

- The script imports initial versions only; it does not yet detect subsequent changes or generate tenant alerts.
- Applying the script writes public/open funder metadata to the linked Supabase project using the server-only service role key.
