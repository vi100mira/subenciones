# Operations Panel

## Decision

The app needs an operations panel from the PMV stage. It should not be a decorative analytics dashboard; it should answer whether the system can handle source ingestion, vectorization, agent calls, blob storage, and channel alerts safely.

## Users

- Platform owner
- Entity owner/admin
- Technical operator
- Future support role

## Metrics to Show

### Ingestion

- runs in last 24h
- queued/running/completed/failed
- documents scanned/inserted/updated/skipped/blocked
- source last sync
- source health
- cursor age
- changed opportunities by severity
- average duration per document

### Vectorization

- chunks queued
- chunks embedded
- failed chunks
- indexing campaigns running
- platform-public source freshness
- tenant-private source freshness
- p95 duration
- embedding cost estimate
- stale documents waiting for reindex

### Agentic Layer

- agent invocations by type
- p95 latency
- failures
- human-review pending count
- critical change alerts pending tenant review
- blocked actions by governance policy

### Storage

- blob objects
- blob size
- extraction artifacts
- orphaned blobs
- documents without blob/hash

### API and Reliability

- API p95 latency
- 4xx and 5xx rates
- source connector errors
- Drive OAuth expiry/refresh failures
- Teams/WhatsApp delivery errors

### Cost

- model tokens
- embedding cost
- blob storage/egress
- worker/job cost
- cost by tenant/source/agent

## Alert Thresholds

- source failed 3 consecutive syncs
- critical deadline or eligibility change detected for an active candidate
- generated draft or checklist uses a superseded opportunity version
- queue older than target SLA
- blocked sensitive documents detected
- OAuth token refresh fails
- cost exceeds daily tenant budget
- p95 API latency above target
- vectorization backlog grows faster than completion rate
- public source campaign has repeated failed batches
- tenant-private source tries to index blocked/sensitive files

## Product Implication

This panel is part of trust. It lets each entity and the platform understand if the system is safe, current, and economically controlled.
