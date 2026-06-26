# Secure Onboarding and Auth Flow

## Decision

Use Supabase Auth as the identity layer. A Gmail address can be the user's login email, including for the Novaterra demo user, but a personal Gmail account should not be used as the transactional mail sender for production invites.

For the demo:

- Create a Supabase Auth user with the chosen Gmail address.
- Link that auth user to Novaterra through `organization_memberships`.
- Use `owner` or `admin` role for the first validated Novaterra user.

For production:

- Use Supabase email/password or magic-link auth.
- Configure a transactional email provider or approved SMTP sender.
- Require verified email before tenant activation.
- Require terms acceptance before any entity analysis.

## Flow

1. Visitor lands on a public page explaining the tool, privacy posture, public radar, and entity activation.
2. Visitor can search public opportunities without login.
3. Visitor requests entity activation with minimal data: entity name, website, territory, requester email, and proposed admin email.
4. Backend creates `tenant_onboarding_requests` in `requested` status.
5. Platform review or automated checks create a tenant in `onboarding` status.
6. Backend creates `tenant_user_invitations` for the proposed admin with role `owner`.
7. Admin receives email, signs in, and must accept terms.
8. Admin grants or denies `public_web_analysis` consent.
9. Public web analysis, if allowed, creates `tenant_profile_suggestions`, never approved facts.
10. Admin reviews suggestions and approves/rejects them.
11. Optional Drive/SharePoint connectors require separate consent and narrow folder selection.
12. Tenant becomes `active` only after admin validation.

## Role Gates

- `reader`: read approved entity context and radar.
- `member`: create working notes and draft preparation tasks.
- `analyst`: run matching and prepare draft Word outputs.
- `admin`: approve facts, manage sources, invite users, grant/revoke consents.
- `owner`: full tenant governance, billing/social plan, deletion/export.
- `platform superadmin`: manage public sources and onboarding, without default access to tenant-private content.

## Security Rules

- Do not activate a tenant from a requester email alone.
- Do not analyze a website before explicit consent.
- Do not treat AI-generated profile fields as approved.
- Do not connect broad Drive/SharePoint roots.
- Do not store raw invite tokens; store hashes only.
- Audit every request, invite, acceptance, consent, suggestion, approval, connector grant, and export.
