# Access, Onboarding, Roles, and Social Pricing

## Product Principle

The product should be useful before an entity connects private data. Public grant discovery can be open or low-friction. Anything involving entity data, private sources, drafting, exports, audit, or team management requires an authenticated tenant account.

The economic posture is third-sector first: charge for operational value and sustainability, not for exploiting social vulnerability, private data, public information scarcity, or paid ranking. See `docs/product/third-sector-principles.md`.

## Access Model

| User type | Can search public grants | Can save opportunities | Can use entity facts | Can connect Drive/SharePoint | Can export drafts | Can manage users |
| --- | --- | --- | --- | --- | --- | --- |
| Visitor | Yes | No | No | No | No | No |
| Registered individual | Yes | Limited personal watchlist | No | No | No | No |
| Entity reader | Yes | Yes | View approved facts | No | No | No |
| Entity member | Yes | Yes | Use approved facts | No | Draft only | No |
| Analyst | Yes | Yes | Use approved facts | No | Draft only | No |
| Admin | Yes | Yes | Approve allowed data | Yes, with consent | Yes | Invite/manage users |
| Owner | Yes | Yes | Full tenant governance | Yes, with consent | Yes | Full tenant control |
| Platform superadmin | Yes | Platform sources only | No tenant private data by default | No tenant private data by default | No tenant drafts | Platform operations |

## Entity Onboarding

Minimum invasive onboarding:

1. Entity name, legal form, territory, language, and contact.
2. Areas of interest, target collectives, typical project types, and budget ranges.
3. Optional approved facts entered through a guided interview.
4. Optional uploads of specific documents selected by the entity.
5. Optional Drive/SharePoint connection only after explicit consent and folder-level selection.

Do not ask for broad storage access. Ask for a narrow grants folder or selected documents. Sensitive case files should default to blocked.

## Safe Entity Activation Flow

1. A requester enters minimal public identity data: entity name, website, tax/legal identifier if available, territory, and contact email.
2. The app creates a non-public tenant in `onboarding` status. Nothing is visible to other entity users yet.
3. The requester must identify an entity admin/supervisor email. The app sends an invitation explaining purpose, data classes, public-web analysis, optional connectors, retention, and deletion rights.
4. The invited admin signs in through magic link or password setup and must accept terms before any entity analysis is activated.
5. Public-web analysis is opt-in. The admin can allow analysis of the entity website, deny it, or limit it to specific URLs.
6. AI-generated entity profile fields are created as suggestions, not approved facts.
7. The admin reviews suggested fields, edits them, approves allowed facts, or rejects them.
8. Private connectors such as Drive or SharePoint require a separate consent step and folder-level selection.
9. Only after admin validation does the tenant move from `onboarding` to `active`.
10. Every action creates an audit event: request, invite, acceptance, web-analysis consent, suggested facts, approval/rejection, connector consent, and activation.

Do not treat website analysis as harmless just because the content is public. The entity should still know that the product is using its public text to infer operating profile, target collectives, and matching signals.

## Login and Roles

Use Supabase Auth for real login. The database already has:

- `organizations` as tenants.
- `organization_memberships` with roles: `owner`, `admin`, `analyst`, `member`, `reader`.
- RLS helper functions for tenant membership and source management.
- Tenant-scoped source documents, chunks, audit events, ingestion runs, and configuration.

Next backend slice:

1. Add email magic-link login.
2. Add invitation flow from owner/admin.
3. Add role-based UI gates in the prototype.
4. Persist audit events for login, invite, source approval, export, and document generation.
5. Keep public search available without login.

## Credential E2E Matrix

These are the access paths the product must verify end to end. The current prototype only simulates credentials; production must enforce the same matrix with Supabase Auth, tenant membership, RLS, audit events, and invitation state.

| E2E case | Credential state | Expected destination | Data boundary | Monetization relation |
| --- | --- | --- | --- | --- |
| Public visitor | No credentials | Public radar/search | Public grant sources only | Free, not paywalled |
| Public onboarding requester | Email in request form, not authenticated | Request created in review state | Minimal public/entity contact data only | Not billable until tenant activation |
| Invited entity admin | Verified email invitation, terms pending | Terms and consent gate | No private analysis until accepted | Activation path, not charged for consent itself |
| Entity reader | Authenticated tenant member | Entity cockpit, read-only surfaces | Approved tenant facts only | Can be included in free/low-cost seat tier |
| Entity member/docente-gestor | Authenticated tenant member | Entity profile, opportunities, candidature preparation | Approved facts and assigned workflows | Monetizable as an operational seat above free threshold |
| Analyst | Authenticated tenant analyst | Matching, checklist, Word draft preparation | Approved facts and evidence only | Monetizable when using drafting, alerts, or private RAG |
| Admin/owner | Authenticated tenant admin/owner | Governance, users, sources, consents, exports | Tenant-private data under governance | Monetizable for team management, connectors, audit, private storage |
| Platform superadmin | Platform credential, no tenant membership by default | Platform, operations, public source campaigns | Platform-public sources and operational metadata | Internal operating role, not a tenant billable user |
| Suspended/revoked user | Credential exists but membership disabled | Access denied with support path | No tenant data | No active charge after revocation window |

Current prototype guardrails:

- `scripts/guardrails/check-onboarding-ui.mjs` verifies that the public landing requires a credential form and has no direct role buttons.
- The same guardrail verifies a platform superadmin path and the Novaterra docente/gestor demo path.
- `scripts/guardrails/check-onboarding-e2e.mjs` verifies the onboarding API without writing unless explicitly enabled.

## Monetization Boundaries

The product can charge for operational value, not for artificial scarcity or sensitive data extraction.

Because the target market is third-sector and social-impact entities, pricing must be proportionate to mission, size, and capacity. The business model should support the product sustainably without behaving like a normal profit-maximizing SaaS that extracts maximum willingness to pay from essential social work.

Always free or non-billable:

- Public grant discovery from official/public sources.
- Inspecting official source links and evidence for a public opportunity.
- Requesting entity onboarding.
- Consent, deletion, export of own data, and account closure rights.
- Basic explanation of why a public opportunity may or may not fit.

Potentially billable, with social pricing caps:

- Tenant workspace with multiple validated users.
- Alerts, saved opportunities, collaborative review, and deadline tracking.
- Private source connectors such as Drive or SharePoint after explicit consent.
- Private RAG over approved tenant documents or guided-interview facts.
- Word draft generation, candidature checklists, annex tracking, and audit exports.
- Admin governance tools, role management, source health, cost visibility, and compliance evidence.

Never monetizable:

- Third-sector vulnerability as a product asset.
- Sensitive beneficiary data as a product asset.
- Sale, reuse, or cross-tenant training on private embeddings or tenant documents.
- Paid placement or ranking of grant opportunities.
- Blocking access to public official information that the product already indexed from public sources.
- Automatic eligibility decisions without human review.

## Evidence and Original Documents

Every recommendation must show:

- Official source URL.
- Bases or announcement URL where available.
- Extracted text/snippet used for the recommendation.
- Deadline confidence and whether it is calculated or uncertain.
- Internal facts used, if any, with data class labels.

The user must be able to inspect the original source before trusting a match.

## Social Pricing

The pricing should sustain the product without exploiting social-sector budgets.

Recommended model:

- Free public radar for everyone, with no private data storage.
- Low-cost entity plan for small NGOs, capped by size or annual budget.
- Cooperative/solidarity tier: larger entities subsidize smaller ones.
- Paid premium only for operational value: team seats, alerts, private source connectors, audit exports, Word drafting, and governance controls.
- No paywall around basic public grant discovery.
- Transparent cost line for AI/vector usage when private RAG is enabled.
- Discounts or sponsored seats for very small entities, federations, or pilot cohorts.

Ethical constraints:

- Do not monetize sensitive beneficiary data.
- Do not sell or reuse tenant-private embeddings.
- Do not rank opportunities based on paid placement.
- Do not make public information artificially scarce.
- Keep deletion/export available to every tenant.
