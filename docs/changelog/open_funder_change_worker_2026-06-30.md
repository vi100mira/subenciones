# Open Funder Change Worker - 2026-06-30

## Intent

Add the first deterministic change-detection worker for platform-curated private-open funder opportunities. The worker compares normalized catalogue hashes against current Supabase opportunity versions and can create new versions plus platform change events when changes are detected.

## Files Touched

- `scripts/platform/detect-open-funder-changes.mjs`
- `package.json`

## Verification

- `npm run platform:detect-open-funder-changes` reported 12 unchanged catalogue opportunities.
- `npm run platform:detect-open-funder-changes -- --simulate-deadline-change` reported 1 critical deadline change and 11 unchanged opportunities, without writing to Supabase.
- `npm run check:stability` passed.

## Residual Risks

- The worker compares the curated catalogue snapshot only; it does not yet fetch live funder webpages.
- Tenant impact alert generation is still a separate next step.
- Applying changes uses sequential Supabase writes, not a stored procedure transaction yet.
