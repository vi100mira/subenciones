-- Revisiones explícitas de descargas de trabajo de una candidatura.
-- No aprueban ni presentan el expediente y no almacenan contenido documental.

create table if not exists public.tenant_candidature_working_exports (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  recommendation_id uuid not null,
  agent_run_id uuid references public.tenant_agent_runs(id) on delete set null,
  draft_version_id uuid references public.tenant_draft_versions(id) on delete set null,
  scope text not null check (scope in ('document', 'check', 'all')),
  scope_ref text not null check (char_length(scope_ref) between 1 and 160),
  snapshot_hash text not null check (snapshot_hash ~ '^[a-f0-9]{64}$'),
  manifest_json jsonb not null default '{}'::jsonb
    check (jsonb_typeof(manifest_json) = 'object'),
  reviewed_by uuid not null,
  reviewed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  foreign key (tenant_id, recommendation_id)
    references public.tenant_opportunity_recommendations(tenant_id, id) on delete cascade
);

create index if not exists tenant_candidature_working_exports_history_idx
  on public.tenant_candidature_working_exports(
    tenant_id, recommendation_id, created_at desc
  );

alter table public.tenant_candidature_working_exports enable row level security;

create policy "members can read candidature working exports"
  on public.tenant_candidature_working_exports for select
  using (public.is_org_member(tenant_id));

comment on table public.tenant_candidature_working_exports is
  'Audited human acknowledgements for tenant-private working-copy downloads. A row never means final approval or submission permission.';
