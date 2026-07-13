-- Revisión documental pública, versionada y pendiente de decisión humana.

create table if not exists public.tenant_document_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
  opportunity_version_id uuid not null references public.platform_opportunity_versions(id) on delete restrict,
  agent_run_id uuid references public.tenant_agent_runs(id) on delete set null,
  requirements_json jsonb not null default '[]'::jsonb,
  risks_json jsonb not null default '[]'::jsonb,
  source_manifest_json jsonb not null default '{}'::jsonb,
  human_review_status text not null default 'pending'
    check (human_review_status in ('pending', 'reviewed', 'dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, opportunity_version_id)
);

create index if not exists tenant_document_reviews_tenant_idx
  on public.tenant_document_reviews(tenant_id, human_review_status, updated_at desc);

alter table public.tenant_document_reviews enable row level security;

create policy "members can read tenant document reviews"
  on public.tenant_document_reviews for select
  using (public.is_org_member(tenant_id));

create policy "admins can review tenant document reviews"
  on public.tenant_document_reviews for update
  using (public.can_manage_sources(tenant_id))
  with check (public.can_manage_sources(tenant_id));
