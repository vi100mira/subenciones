# Multi-Tenant Isolation

## Product Decision

The product is not a custom Novaterra tool. Novaterra can be a pilot or sample tenant, but the system must serve many independent social-impact entities under the same product skeleton.

Each entity is a tenant with its own configuration, motivations, source map, private documents, private embeddings, agent permissions, audit trail, cost accounting, and retention policy.

## Isolation Rules

- Every private row must carry `tenant_id`.
- Every private document, chunk, embedding, recommendation, agent run, audit event, and cost metric belongs to exactly one tenant.
- No private chunk or private embedding can be reused, copied, promoted, or queried by another tenant.
- Platform-public grant sources can be shared across tenants because they are public and indexed by the platform.
- Tenant-public or tenant-curated sources remain tenant-scoped unless a platform admin deliberately promotes them to a public source.
- Channel adapters for Teams, WhatsApp, or email must call the tenant-aware orchestrator and pass tenant identity explicitly.

## Tenant Configuration

Entities with similar missions may still differ in:

- geography and administrative scope
- legal form and eligibility patterns
- target collectives
- preferred funders and excluded funders
- risk tolerance
- language and vocabulary
- internal program lines
- approval workflow

Store those differences as tenant configuration and approved entity facts, not as global product assumptions.

## Retrieval Shape

For a recommendation request, the orchestrator should:

1. Resolve the active tenant and user permissions.
2. Retrieve from the platform-public grant corpus.
3. Retrieve from that tenant's private corpus only when allowed.
4. Combine evidence without exposing private facts to other tenants.
5. Write an audit event with tenant, actor, sources used, data classes, and output status.

## Operational Requirements

The operations panel must be filterable by tenant and by platform scope:

- platform ingestion campaigns
- tenant-private ingestion runs
- vectorization queues
- blocked documents
- model cost
- latency and errors
- connector health

Cross-tenant dashboards should show aggregates only. Tenant admins should only see their own tenant data.

## MVP Consequence

Use one pilot entity to validate the workflow, but do not name database tables, API defaults, UI labels, or agent policies after the pilot. Fixtures may mention the pilot as sample data, clearly marked as demo data.
