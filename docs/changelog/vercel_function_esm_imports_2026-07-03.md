# Vercel Function ESM Imports - 2026-07-03

## Intent

Fix Preview authentication and API startup failures caused by extensionless relative imports in Vercel serverless functions running as ESM.

## Files Touched

- `api/*.ts`
- `docs/changelog/vercel_function_esm_imports_2026-07-03.md`

## Verification

- Runtime log from Preview showed `ERR_MODULE_NOT_FOUND` for `/var/task/src/apiResponse` when loading `api/auth-session.js`.
- `npm run check:stability` passes.
- New Preview deployed at `https://subvenciones-gp925vuxz-vicentmirabarrachina-3617s-projects.vercel.app`.
- `/api/auth-session` smoke test with fake credentials now returns controlled JSON: `401 {"ok":false,"error":"Credenciales no validas"}`.

## Residual Risk

This only fixes module resolution for Vercel functions. Valid login still depends on Supabase Auth users, tenant membership rows, and Preview environment variables being correct.
