# Credentials Gate - 2026-07-01

## Intent

Add a first credential gate for superadmin and tenant admin access without storing plaintext passwords in the prototype.

## Files Touched

- `api/auth-session.ts`
- `src/supabaseAdmin.ts`
- `prototype/auth-credentials.js`
- `prototype/public-entry.js`
- `prototype/index.html`
- `.env.example`
- `package.json`
- `scripts/admin/upsert-auth-users.mjs`
- `scripts/admin/verify-auth-users.mjs`
- `scripts/guardrails/check-onboarding-ui.mjs`
- `docs/architecture/credentials-and-tenant-auth.md`

## Verification

- `npm run check:stability` passes.
- Checked that prototype, scripts and docs do not contain the provided superadmin password or the seeded tenant password in clear text.
- Browser-side credential hashes were removed; login now calls `api/auth-session.ts`.
- Browser check: direct `#view-platform` access without session redirects to institutional access.
- `npm run auth:seed-users` creates/updates Supabase Auth users from environment variables.
- `npm run auth:verify-users` verifies superadmin allowlist and Novaterra owner membership without printing tokens.
- Vercel dev API check: `api/auth-session.ts` returns `superadmin/platform` for the platform account and `entity/owner/entity` for Novaterra admin.
- Browser check with API runtime: superadmin opens Plataforma, tenant opens Perfil de entidad, tenant direct access to Plataforma returns to Acceso institucional.
- Follow-up fix: `api/auth-session.ts` now loads `.env.local` server-side when the local Vercel runtime does not inject environment variables, and accepts `VITE_SUPABASE_URL` as a local alias. This keeps secrets server-side and avoids the false `SUPABASE_URL y SUPABASE_ANON_KEY son obligatorias para login` rejection.
- Local API check on port `4190`: a fake login now returns `401 Credenciales no validas`, proving the endpoint reaches Supabase Auth instead of failing on configuration.
- Local superadmin fix: `.env.local` now allowlists `vicentmirabarrachina@gmail.com` through `AUTH_SUPERADMIN_EMAIL` and `PLATFORM_ADMIN_EMAILS`. After restarting `vercel dev` on port `4190`, the browser session opens `#view-platform` with role `superadmin`.
- Follow-up UX: the institutional login password field now has an eye toggle. Browser check confirmed it starts as `password`, switches to `text` with `Ocultar contrasena`, then returns to `password`.
- Follow-up UX: login now detects the common typo `@novatera.org.es` and tells the user to use `pmira@novaterra.org.es`; `index.html` bumps `public-entry.js` cache version so the browser loads the new helper.

## Residual Risk

The login boundary now uses Supabase Auth. Production still needs hardened session refresh/recovery, MFA policy and optional tenant SSO.
