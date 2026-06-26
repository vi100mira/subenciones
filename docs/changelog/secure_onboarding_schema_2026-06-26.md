# Secure Onboarding Schema - 2026-06-26

## Intent

Add the Supabase data structures needed for secure entity activation, invitations, consent, terms acceptance, and AI-generated profile suggestions pending human approval.

## Changed

- Added `supabase/migrations/20260626103000_secure_onboarding.sql`.
- Added `tenant_onboarding_requests`.
- Added `tenant_user_invitations`.
- Added `tenant_terms_acceptances`.
- Added `tenant_data_consents`.
- Added `tenant_profile_suggestions`.
- Added RLS policies for tenant member reads and admin governance actions.
- Added `docs/architecture/secure-onboarding-auth-flow.md`.

## Verification

- Ran `npm run check:stability`; TypeScript and line-budget guardrails passed.
- Reviewed the migration structure locally. SQL migration has not been applied to a Supabase instance in this turn.

## Residual Risks

- Email delivery, invite-token generation, rate limiting, CAPTCHA/abuse protection, password reset, and Supabase Auth UI are not implemented yet.
- Onboarding request access is intended for server-side service-role API handling; public direct table access remains blocked by RLS.
