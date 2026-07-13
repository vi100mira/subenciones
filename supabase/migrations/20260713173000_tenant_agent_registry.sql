-- Registro común de capacidades y activación aislada por tenant.

create table if not exists public.platform_agent_definitions (
  agent_key text primary key,
  display_name text not null,
  scope text not null check (scope in ('platform', 'tenant')),
  execution_mode text not null check (execution_mode in ('scheduled', 'on_demand', 'both')),
  requires_human_review boolean not null default true,
  allowed_data_classes text[] not null default array['public']::text[],
  runtime_contract_json jsonb not null default '{}'::jsonb,
  catalog_version integer not null default 1,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tenant_agent_configs (
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  agent_key text not null references public.platform_agent_definitions(agent_key) on delete restrict,
  status text not null default 'requested'
    check (status in ('requested', 'blocked', 'ready', 'paused', 'disabled')),
  enabled boolean not null default false,
  permissions_json jsonb not null default '{}'::jsonb,
  config_json jsonb not null default '{}'::jsonb,
  status_reason text,
  provisioned_version integer not null default 1,
  activated_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (tenant_id, agent_key)
);

create index if not exists tenant_agent_configs_status_idx
  on public.tenant_agent_configs(tenant_id, status, enabled);

alter table public.platform_agent_definitions enable row level security;
alter table public.tenant_agent_configs enable row level security;

create policy "authenticated users can read agent catalog"
  on public.platform_agent_definitions for select
  using (auth.uid() is not null);

create policy "members can read tenant agent configs"
  on public.tenant_agent_configs for select
  using (public.is_org_member(tenant_id));

-- Mutaciones pasan por APIs de administración para validar permisos y auditar cambios.

insert into public.platform_agent_definitions (
  agent_key, display_name, scope, execution_mode, requires_human_review,
  allowed_data_classes, runtime_contract_json
)
values
  ('grant_search', 'Búsqueda de convocatorias', 'platform', 'scheduled', false,
    array['public'], '{"worker":"hosted_radar","output":"versioned_public_opportunities"}'),
  ('entity_research', 'Investigador de entidad', 'tenant', 'on_demand', true,
    array['public'], '{"worker":"entity_research","requires_consent":"public_web_analysis","output":"profile_suggestions"}'),
  ('match_agent', 'Asistente de encaje', 'tenant', 'both', true,
    array['public','internal_approved'], '{"worker":"tenant_match","output":"evidence_backed_recommendations"}'),
  ('document_review', 'Revisión documental', 'tenant', 'on_demand', true,
    array['public','internal_approved'], '{"worker":"document_review","output":"requirements_and_evidence"}'),
  ('draft_agent', 'Borrador de memoria', 'tenant', 'on_demand', true,
    array['public','internal_approved'], '{"worker":"draft_agent","output":"review_required_draft"}'),
  ('alert_agent', 'Avisos y recordatorios', 'tenant', 'scheduled', true,
    array['public'], '{"worker":"tenant_alerts","output":"reviewable_alerts"}')
on conflict (agent_key) do update set
  display_name = excluded.display_name,
  scope = excluded.scope,
  execution_mode = excluded.execution_mode,
  requires_human_review = excluded.requires_human_review,
  allowed_data_classes = excluded.allowed_data_classes,
  runtime_contract_json = excluded.runtime_contract_json,
  catalog_version = excluded.catalog_version,
  active = true,
  updated_at = now();

-- La cola deja de asumir que toda ejecución pertenece a una convocatoria.
alter table public.tenant_agent_runs
  drop constraint if exists tenant_agent_runs_agent_key_check;

alter table public.tenant_agent_runs
  alter column opportunity_id drop not null,
  alter column opportunity_version_id drop not null,
  add column if not exists dedupe_key text;

alter table public.tenant_agent_runs
  add constraint tenant_agent_runs_agent_key_fk
  foreign key (agent_key)
  references public.platform_agent_definitions(agent_key)
  on delete restrict;

alter table public.tenant_agent_runs
  add constraint tenant_agent_runs_context_check
  check (
    agent_key <> 'draft_agent'
    or (opportunity_id is not null and opportunity_version_id is not null)
  );

create unique index if not exists tenant_agent_runs_active_dedupe_idx
  on public.tenant_agent_runs(tenant_id, agent_key, dedupe_key)
  where dedupe_key is not null
    and status in ('queued', 'preparing_context', 'awaiting_provider', 'generating');
