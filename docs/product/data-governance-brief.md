# Data Governance Brief

## Entity Data Inventory

- Public: website, annual reports, published project descriptions, public funding history.
- Internal: strategy notes, program priorities, draft project ideas, non-public KPIs, partner context.
- Personal: staff contact details, CV fragments, salaries, named reviewers.
- Sensitive: beneficiary stories, intervention records, minors, disability, health, migration/legal status, violence, exclusion case history.

## Data Classification

| Class | Use in MVP | External AI policy |
| --- | --- | --- |
| Public | Matching, drafting, summaries | Allowed |
| Internal approved | Matching and drafting inside tenant | Minimize; prefer local retrieval |
| Personal | Only if needed for formal requirements | Anonymize or avoid |
| Sensitive | Not needed for MVP | Block |
| Secrets | Never | Block |

## AI Processing Boundaries

- Public grant data and public entity facts can be used for generation.
- Internal facts must be retrieved only from the current tenant.
- Sensitive beneficiary data is excluded from the MVP.
- Generated recommendations must show public evidence and internal facts used.

## Retention and Deletion

- Pilot data must be deletable by entity administrators.
- Draft proposals and audit events are retained until explicit deletion or pilot closure.
- Imported documents must keep source, uploader, class, and approval status.

## Subprocessor and Model Constraints

- No model training on entity data.
- No cross-tenant reuse.
- Provider, model, region, retention, and subprocessor list must be documented before real data is used.

## Audit Requirements

- Log imports, classification, retrieval, generation, exports, approvals, deletions, and channel messages.
- Every match must preserve evidence snippets and source URLs.
- Human review is required before export or channel send.

## Red Lines

- Do not ingest identifiable beneficiary files.
- Do not send sensitive case narratives to external AI.
- Do not present compatibility as legal eligibility.
- Do not let Teams, WhatsApp, or email adapters bypass product permissions.
