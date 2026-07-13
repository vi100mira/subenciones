-- Cola tenant-scoped del agente redactor, con evidencia y revisión humana obligatoria.

create table if not exists public.tenant_agent_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.platform_opportunities(id) on delete restrict,
  opportunity_version_id uuid not null references public.platform_opportunity_versions(id) on delete restrict,
  agent_key text not null default 'draft_agent' check (agent_key in ('draft_agent')),
  status text not null default 'queued' check (status in (
    'queued', 'preparing_context', 'awaiting_provider', 'generating',
    'review_required', 'failed', 'cancelled'
  )),
  use_approved_internal_facts boolean not null default false,
  input_manifest_json jsonb not null default '{}'::jsonb,
  context_manifest_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  provider text,
  model text,
  usage_json jsonb not null default '{}'::jsonb,
  requested_by uuid not null,
  started_at timestamptz,
  finished_at timestamptz,
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenant_agent_runs_tenant_idx
  on public.tenant_agent_runs(tenant_id, created_at desc);

create index if not exists tenant_agent_runs_queue_idx
  on public.tenant_agent_runs(status, created_at)
  where status in ('queued', 'preparing_context', 'awaiting_provider', 'generating');

create unique index if not exists tenant_agent_runs_active_draft_idx
  on public.tenant_agent_runs(tenant_id, opportunity_id, agent_key)
  where status in ('queued', 'preparing_context', 'awaiting_provider', 'generating');

alter table public.tenant_agent_runs enable row level security;

create policy "members can read tenant agent runs"
  on public.tenant_agent_runs for select
  using (public.is_org_member(tenant_id));

-- Inserciones y cambios pasan por APIs/worker con cuenta de servicio para aplicar las puertas.
