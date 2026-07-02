# Tenant Change Alerts API - 2026-06-30

## Intent

Add the tenant-facing API for reading and resolving change alerts generated from platform opportunity change events.

## Files Touched

- `api/tenant-change-alerts.ts`

## Verification

- `npm run check:stability` passed.
- Read-only Supabase verification confirmed 1 active tenant watch and 0 tenant alerts in the current remote state.

## Residual Risks

- The prototype does not yet call this endpoint with a real authenticated tenant session.
- No real alerts exist until a platform change event is generated and matched to active tenant watches.
