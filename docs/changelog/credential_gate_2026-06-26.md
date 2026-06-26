# Credential Gate - 2026-06-26

## Changed

- Replaced public landing role buttons with a prototype credential form.
- Derived entity or superadmin cockpit access from submitted credentials instead of explicit public role actions.
- Extended the UI guardrail to fail if a direct role action is reintroduced.

## Security Note

- This is still a prototype gate. Production access must use Supabase Auth, verified invitations, tenant membership and role policies before any private data is exposed.
