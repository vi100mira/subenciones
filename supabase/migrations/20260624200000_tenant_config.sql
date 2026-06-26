-- ============================================================
-- Subvenciones RAG: tenant configuration and onboarding
-- Fecha: 2026-06-24
-- ============================================================

create table if not exists public.tenant_configs (
  tenant_id uuid primary key references public.organizations(id) on delete cascade,
  display_name text not null,
  logo_url text,
  primary_color text not null default '#24515a',
  status text not null default 'onboarding' check (status in ('onboarding', 'active', 'paused', 'archived')),
  profile_json jsonb not null default '{}'::jsonb,
  motivations_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tenant_configs enable row level security;

create policy "members can read tenant config"
  on public.tenant_configs for select
  using (public.is_org_member(tenant_id));

create policy "admins can update tenant config"
  on public.tenant_configs for update
  using (public.can_manage_sources(tenant_id))
  with check (public.can_manage_sources(tenant_id));

create index if not exists tenant_configs_status_idx
  on public.tenant_configs(status, updated_at desc);
