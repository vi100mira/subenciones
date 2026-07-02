# Change Detection And Tenant Alerts

## Decision

Freshness is a core product capability, not an operations detail. Public bodies and private funders can change deadlines, criteria, documents, budgets, submission channels, and annexes after an opportunity has been discovered. The platform must therefore treat every opportunity as a versioned object with monitored evidence and tenant impact.

The platform superadmin owns the monitoring loop for platform-public and platform-curated sources. Tenants do not run the global RAG. Tenants receive impact alerts only when a changed opportunity matters to their workspace, profile, saved searches, recommendations, or active candidatures.

## AI Cadence And Cost Policy

AI use in the monitoring loop is capped by default. A platform campaign may run lightweight detection with hashes, etags, last-modified headers, API timestamps, and URL health checks without AI, but full AI interpretation must not run more than once per day per campaign unless a platform admin records a manual reason.

Default policy:

- lightweight detection can run more often when it is cheap and deterministic
- AI extraction or semantic interpretation runs only after a detected change
- AI interpretation is daily at most by default
- weekly cadence is preferred for private-open editorial sources unless a live call is active
- manual runs require a reason, estimated cost, and audit event
- tenant-private data is never used during the platform source detection phase

This keeps freshness useful without turning source monitoring into an expensive or noisy continuous agent.

## Versioning Model

Every imported opportunity should keep:

- `canonical_opportunity_id`: stable id across versions
- `source_id`: source or funder
- `source_scope`: platform public, platform curated, tenant private, blocked
- `source_url` and evidence document URLs
- `content_hash`: hash of normalized text used for retrieval
- `deadline_hash`: hash of deadline fields and deadline text
- `deadline_observed`: best human-readable deadline or explicit uncertainty
- `deadline_status`: open, closed, or uncertain
- `deadline_confidence`: high, medium, low, or uncertain
- `deadline_evidence_url`: official page, announcement, API record, or document used
- `deadline_evidence_date`: publication/update date of the evidence when available
- `deadline_read_at`: timestamp of the agent pass that produced the interpretation
- `deadline_next_review_at`: next scheduled check for this deadline
- `deadline_uncertainty_reason`: why the date is not fully safe, when applicable
- `tenant_alarm_policy`: what kind of deadline change should alert affected tenants
- `criteria_hash`: hash of eligibility, beneficiary, territory, activity, budget, and documentation requirements
- `version_number`
- `version_status`: current, superseded, withdrawn, uncertain
- `detected_at`
- `effective_from` when known
- `change_summary`
- `change_severity`
- `human_review_status`

Old versions are not deleted immediately. They become superseded evidence so the platform can explain what changed and why a recommendation or alert was updated.

## Change Types

| Type | Examples | Default Severity |
| --- | --- | --- |
| Deadline changed | end date moved, relative date clarified, deadline closed early | Critical |
| Eligibility changed | beneficiary type, legal form, territory, exclusions | Critical |
| Required documents changed | new annex, certificate, declaration, technical memory section | High |
| Budget changed | total budget, max amount, cofinancing, eligible expenses | High |
| Submission channel changed | sede URL, platform, email, registry, login requirement | High |
| Text/document changed | bases PDF replaced, correction notice, FAQ update | Medium |
| Source health changed | broken URL, 404, timeout, login wall | Medium |
| Minor metadata changed | title punctuation, layout, non-substantive copy | Low |

Critical changes must not silently update a candidate. They create an alert and mark affected recommendations as needing review.

## Iterative Monitoring Loop

### Step 1: Source Watch

Platform worker checks source health, etag/last-modified when available, page hash, API updated timestamp, and known document URLs. This step is deterministic and should be the default recurring work before any AI call.

Stop condition for one source pass:

- all tracked URLs checked
- unchanged items skipped
- changed items queued for normalization
- failed items recorded with retry count and source health

### Step 2: Evidence Diff

Changed documents are normalized, text-extracted, and compared against the previous current version.

The diff should classify whether the change affects deadlines, criteria, documents, budget, submission channel, or only presentation. Use parsers and deterministic comparison first; call AI only when a changed item affects critical fields or cannot be interpreted safely.

Stop condition:

- each changed item has a `change_type`, `change_severity`, and evidence reference
- unclear diffs are marked `human_review_required`

### Step 3: Re-index And Supersede

Only changed documents are chunked and re-embedded. Previous chunks are marked superseded but kept for audit until retention policy removes them.

Stop condition:

- current version points to current chunks
- superseded version remains available for audit
- source campaign metrics include changed, skipped, failed, and human-review counts

### Step 4: Tenant Impact Scan

The platform computes affected tenants without reading tenant-private data broadly.

A tenant is affected when:

- the opportunity is in its candidate workspace
- the opportunity was recommended or dismissed in the last configurable window
- a saved search or alert rule matches the changed opportunity
- the opportunity is inside active tenant preferences by territory, theme, legal form, or funder type
- a draft/checklist was generated from a superseded version

Stop condition:

- every affected tenant gets an impact record
- unaffected tenants are not notified
- no tenant-private chunks are retrieved unless policy allows it

### Step 5: Alert Delivery

Alerts are created in-app first. External channels receive only safe summaries and deep links unless a tenant admin has approved richer channel content.

Stop condition:

- critical alerts are visible in-app
- channel-safe notifications are queued according to tenant preferences
- audit records who/what/when/why for the alert

## Alert Severity

| Severity | Tenant Meaning | Product Behavior |
| --- | --- | --- |
| Critical | Deadline, eligibility, or submission changed in a way that can invalidate action | Immediate in-app alert, optional channel alert, recommendation marked needs review |
| High | Required docs, budget, cofinancing, or channel changed | In-app alert, workspace task updated |
| Medium | Evidence or source health changed, needs checking | Operations/review queue |
| Low | Non-substantive metadata change | Audit only unless user follows the source |

## Tenant Alert Contract

An alert must show:

- opportunity title and funder/source
- what changed
- previous value when known
- new value when known
- evidence URL or document id
- detected time
- confidence
- affected workspace or recommendation
- recommended human action

Example:

```text
Plazo actualizado: Convocatoria social territorial
Antes: plazo por confirmar
Ahora: 2026-09-12
Impacto: candidatura marcada como prioritaria por la entidad
Accion: revisar calendario y checklist antes de continuar
```

## Platform vs Tenant Responsibility

Platform:

- monitors global public and private-open sources
- versions opportunities and evidence
- classifies change severity
- computes affected tenants from platform-side recommendation/workspace metadata
- emits safe alerts

Tenant:

- decides alert preferences and channels
- reviews affected candidatures
- approves any use of tenant-private context
- manages tenant-private source monitoring separately

## MVP Cut

The first backend cut can avoid AI and still be useful:

1. store normalized opportunity versions
2. hash deadline fields and criteria text
3. detect changed hashes
4. create change events
5. match change events to saved/recommended/candidate opportunities
6. render in-app alerts

Semantic diff and AI-generated change summaries can come after deterministic versioning works.
