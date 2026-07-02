# Opportunity Versioning Schema - 2026-06-29

## Intent

Add the first Supabase schema layer for canonical platform opportunities, evidence versions, change events, tenant watches, and tenant change alerts.

## Files Touched

- `supabase/migrations/20260629183000_opportunity_versions_alerts.sql`

## Verification

- `npm run check:stability` passed.
- `npx supabase db lint --linked --level warning --fail-on error` reported no schema errors.
- `npx supabase db push --dry-run --linked --debug` confirmed the only pending remote migration is `20260629183000_opportunity_versions_alerts.sql`.
- `npx supabase db push --linked --yes` applied the migration to the linked Supabase project.
- `npx supabase migration list --debug` confirmed `20260629183000` is present in both Local and Remote.

## Residual Risks

- The migration defines storage and RLS boundaries only; workers and API endpoints are still pending.
- Platform opportunity tables are RLS-protected for service/API access first, so direct browser reads should go through Vercel API functions later.
