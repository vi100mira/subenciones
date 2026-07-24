-- Versiones humanas inmutables de los borradores generados.

create table if not exists public.tenant_draft_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  agent_run_id uuid not null references public.tenant_agent_runs(id) on delete cascade,
  opportunity_version_id uuid not null references public.platform_opportunity_versions(id) on delete restrict,
  base_version_id uuid references public.tenant_draft_versions(id) on delete restrict,
  version_number integer not null check (version_number > 0),
  status text not null default 'editing' check (status in ('editing', 'approved', 'rejected')),
  content_json jsonb not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  change_note text not null default '',
  created_by uuid not null,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (tenant_id, agent_run_id, version_number)
);

create index if not exists tenant_draft_versions_history_idx
  on public.tenant_draft_versions(tenant_id, agent_run_id, version_number desc);

alter table public.tenant_draft_versions enable row level security;

create policy "members can read tenant draft versions"
  on public.tenant_draft_versions for select
  using (public.is_org_member(tenant_id));

alter table public.tenant_draft_reviews
  add column if not exists draft_version_id uuid references public.tenant_draft_versions(id) on delete restrict;

-- Las decisiones humanas deben atravesar la API servidor para fijar versión,
-- invalidar exportaciones anteriores y escribir el evento de auditoría.
drop policy if exists "admins can review tenant drafts"
  on public.tenant_draft_reviews;

comment on table public.tenant_draft_versions is
  'Immutable tenant-private human revisions of generated draft content. Mutations are owned by audited server APIs.';
