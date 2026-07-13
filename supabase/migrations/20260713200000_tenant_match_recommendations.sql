-- Recomendaciones explicables y revisables por tenant.

create table if not exists public.tenant_opportunity_recommendations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
  opportunity_version_id uuid not null references public.platform_opportunity_versions(id) on delete restrict,
  agent_run_id uuid references public.tenant_agent_runs(id) on delete set null,
  score integer not null check (score between 0 and 100),
  recommendation_status text not null
    check (recommendation_status in ('candidate', 'review', 'low_fit')),
  reasons_json jsonb not null default '[]'::jsonb,
  risks_json jsonb not null default '[]'::jsonb,
  missing_information_json jsonb not null default '[]'::jsonb,
  evidence_json jsonb not null default '[]'::jsonb,
  internal_fact_refs_json jsonb not null default '[]'::jsonb,
  profile_snapshot_hash text not null,
  human_review_status text not null default 'pending'
    check (human_review_status in ('pending', 'reviewed', 'dismissed')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, opportunity_id, opportunity_version_id)
);

create index if not exists tenant_recommendations_rank_idx
  on public.tenant_opportunity_recommendations(
    tenant_id, recommendation_status, score desc, updated_at desc
  );

create index if not exists tenant_recommendations_review_idx
  on public.tenant_opportunity_recommendations(tenant_id, human_review_status, updated_at desc);

alter table public.tenant_opportunity_recommendations enable row level security;

create policy "members can read tenant recommendations"
  on public.tenant_opportunity_recommendations for select
  using (public.is_org_member(tenant_id));

create policy "admins can review tenant recommendations"
  on public.tenant_opportunity_recommendations for update
  using (public.can_manage_sources(tenant_id))
  with check (public.can_manage_sources(tenant_id));

-- Cálculo y alta pasan por worker con service role; ninguna recomendación decide elegibilidad.
