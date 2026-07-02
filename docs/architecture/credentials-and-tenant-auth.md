# Credentials And Tenant Auth

## Decision

The product needs separate authentication paths for platform superadmin and tenant users.

- Platform superadmin authenticates as a platform user and can access platform source management, operations and global audit.
- Tenant users authenticate inside a tenant context and can only access that tenant's entity cockpit, opportunities, workspace and tenant-scoped audit.
- Novaterra is the pilot tenant. Its admin credential is a seeded prototype account, not a product-wide assumption.

## Current Implementation

The current app uses `api/auth-session.ts` as the credential boundary.

- Passwords are submitted only to the server login endpoint.
- The server authenticates against Supabase Auth with the anon/publishable key.
- The server uses the service role only to resolve platform allowlist and tenant membership.
- Superadmin access is allowed by `PLATFORM_ADMIN_EMAILS` or `AUTH_SUPERADMIN_EMAIL`.
- The browser stores the returned access token in `sessionStorage` for the prototype.
- Direct access to `#view-platform` and `#view-operations` requires a superadmin session.

`scripts/admin/upsert-auth-users.mjs` provisions or rotates the initial users from environment variables. It never contains plaintext passwords in the repository.

## Production Path

Production keeps Supabase Auth as the identity layer:

- Supabase Auth for email/password, recovery, MFA and session refresh.
- `organizations` as tenants.
- `organization_memberships` for tenant roles.
- RLS policies for tenant data, private sources, audit events and configuration.
- Platform roles stored separately from tenant memberships.
- Optional future SSO per tenant, starting with Microsoft Entra ID / Microsoft 365 when the tenant requests it.

Before production, move browser session handling to a hardened auth client/cookie strategy and enforce token refresh, logout invalidation and recovery flows.

## External Identity Later

Tenant SSO must be optional. A tenant can keep platform-managed credentials or connect its own identity provider.

For Microsoft integration:

- Use Microsoft Entra ID OAuth/OIDC.
- Map tenant users to memberships after verified domain/admin consent.
- Never reuse Microsoft credentials directly inside this app.
- Store tokens server-side only, encrypted, scoped and revocable.
