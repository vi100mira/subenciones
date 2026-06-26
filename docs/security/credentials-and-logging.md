# Credentials and Logging

## Decision

Credentials live outside the repository. Logs are useful for operations, but application logs must never contain raw tokens, Drive credentials, service-role keys, personal records, beneficiary stories, or document full text.

## Credential Surfaces

| Surface | Storage | Notes |
| --- | --- | --- |
| Browser public config | `VITE_*` env vars | Only anon/public keys. Never service keys. |
| Vercel Functions | Vercel environment variables | Use Sensitive Environment Variables for secrets. |
| Supabase server access | `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Bypasses RLS. Never expose to browser. |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` | Server-only; direct uploads use scoped upload tokens. |
| Google Drive OAuth | encrypted DB/token store later | Start with user-delegated OAuth and narrow folders. |
| Microsoft Graph OAuth | encrypted DB/token store later | Prefer delegated or resource-specific access for pilot. |
| Worker webhook | `INGESTION_WORKER_SECRET` | Rotateable service-to-service secret. |

Official references:

- Vercel Environment Variables: https://vercel.com/docs/environment-variables
- Vercel Sensitive Environment Variables: https://vercel.com/docs/environment-variables/sensitive-environment-variables
- Supabase function secrets / service role warning: https://supabase.com/docs/guides/functions/secrets

## Environments

Use separate credentials for:

- local
- preview
- production

Do not reuse production Drive OAuth apps or service-role keys in local development. Local simulation should use `data/simulated_drive` or a personal test folder.

## Rotation

Rotate credentials when:

- a collaborator leaves
- a token is pasted into chat/logs
- Vercel/Supabase reports suspicious access
- OAuth scopes change
- moving from pilot to production

Minimum rotation targets:

- Supabase service role key
- Vercel Blob token
- OAuth client secrets
- worker webhook secret

## Logging Policy

Application logs may include:

- event name
- tenant id
- source id
- run id
- document id
- counts
- status
- duration
- high-level error message

Application logs must not include:

- `Authorization` headers
- access/refresh tokens
- service-role keys
- OAuth secrets
- full document text
- raw beneficiary data
- raw prompts containing private context
- embeddings from private documents
- signed upload URLs after token generation

Use `src/logger.ts` for Vercel Functions instead of raw `console.log` when logging structured events.

## Operational Logs

Vercel provides runtime/build logs and supports Drains for forwarding logs, traces, Speed Insights, and Web Analytics to external observability tools on supported plans.

Official references:

- Vercel Drains: https://vercel.com/docs/drains
- Vercel Log Drains: https://vercel.com/docs/drains/reference/logs

Recommended path:

1. MVP: Vercel logs + Supabase tables `audit_events` and `ingestion_runs`.
2. Pilot: add Sentry or Axiom/Datadog through Vercel Drains if volume grows.
3. Production: define retention and export policy by tenant.

## Audit Logs vs Debug Logs

Debug/runtime logs are for engineers and may be ephemeral.

Audit logs are product data and must be queryable:

- login/authentication events: Supabase Auth audit logs
- source connected/paused/deleted
- document ingested/blocked
- agent invoked
- recommendation generated
- export approved
- channel message sent
- data deleted

Supabase provides Auth audit logs and platform audit logs; application-level audit still belongs in our `audit_events` table.

Official references:

- Supabase Auth Audit Logs: https://supabase.com/docs/guides/auth/audit-logs
- Supabase Platform Audit Logs: https://supabase.com/docs/guides/security/platform-audit-logs
- Supabase Logs Explorer: https://supabase.com/docs/guides/telemetry/logs
- Supabase PGAudit: https://supabase.com/docs/guides/database/extensions/pgaudit

## Drive Credentials

For Drive/OneDrive, do not store raw corporate credentials. Use OAuth:

- connect source
- receive authorization code
- exchange server-side
- encrypt refresh token
- store provider, tenant id, drive/folder ids, scopes, expiry, and status
- audit all syncs

For the pilot, prefer user-delegated folder-level access over domain-wide delegation or broad application permissions.

## Private Embeddings

Embeddings generated from any entity's internal/private documents are treated as private tenant data:

- they are stored with `tenant_id`
- they are protected by RLS/API filters
- they are not reused across tenants
- they are not logged
- they are deleted/reindexed when the source document is deleted or superseded

## Minimum Implementation Checklist

- `.env.example` documents required keys.
- `.env` and `.env.local` are gitignored.
- Vercel production secrets marked sensitive where possible.
- Supabase service role used only in server functions.
- Upload tokens are scoped to tenant path.
- Logger redacts obvious secret keys.
- Application audit events stored in Supabase.
- Logs never contain raw document content or prompts with private context.
