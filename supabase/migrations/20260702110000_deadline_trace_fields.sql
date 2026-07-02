-- ============================================================
-- Subvenciones RAG: deadline traceability fields
-- Fecha: 2026-07-02
-- ============================================================

alter table public.platform_opportunity_versions
  add column if not exists deadline_observed text,
  add column if not exists deadline_evidence_url text,
  add column if not exists deadline_evidence_date date,
  add column if not exists deadline_read_at timestamptz,
  add column if not exists deadline_next_review_at timestamptz,
  add column if not exists deadline_uncertainty_reason text,
  add column if not exists tenant_alarm_policy text;

create index if not exists platform_opportunity_versions_deadline_review_idx
  on public.platform_opportunity_versions(deadline_next_review_at, deadline_status, deadline_confidence)
  where version_status = 'current';
