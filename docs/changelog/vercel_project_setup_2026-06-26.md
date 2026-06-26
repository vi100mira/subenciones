# Vercel Project Setup - 2026-06-26

## Intent

Create and link a Vercel project for the grants prototype while keeping deployment configuration explicit.

## Changed

- Created Vercel project `subvenciones-rag`.
- Linked the local workspace to the Vercel project.
- Set `vercel.json` output directory to `prototype`.
- Updated rewrites to serve `prototype/index.html` as the app entrypoint.
- Disabled Vercel SSO deployment protection for this static preview so the demo URL can be opened without Vercel login.

## Verification

- Ran `npm run check:stability`; typecheck and line-budget guardrails passed.
- Preview deployment succeeded: `https://subvenciones-ox62dv6zu-vicentmirabarrachina-3617s-projects.vercel.app`.
- Verified with Playwright that the deployed URL loads `Subvenciones RAG MVP` and shows the app navigation.

## Residual Risks

- Supabase environment variables are not configured yet.
- The first deployment attempt failed before the output directory was configured.
