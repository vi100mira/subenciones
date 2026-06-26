# Access, Onboarding, Roles, and Social Pricing

## Product Principle

The product should be useful before an entity connects private data. Public grant discovery can be open or low-friction. Anything involving entity data, private sources, drafting, exports, audit, or team management requires an authenticated tenant account.

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
