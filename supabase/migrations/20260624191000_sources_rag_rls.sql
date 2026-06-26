-- ============================================================
-- Subvenciones RAG: RLS baseline
-- Fecha: 2026-06-24
-- ============================================================

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;
alter table public.source_connections enable row level security;
alter table public.source_documents enable row level security;
alter table public.document_chunks enable row level security;
alter table public.ingestion_runs enable row level security;
alter table public.audit_events enable row level security;

create or replace function public.is_org_member(target_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.tenant_id = target_tenant_id
      and m.auth_user_id = auth.uid()
      and m.status = 'active'
  );
$$;

create or replace function public.can_manage_sources(target_tenant_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_memberships m
    where m.tenant_id = target_tenant_id
      and m.auth_user_id = auth.uid()
      and m.status = 'active'
      and m.role in ('owner', 'admin')
  );
$$;

create policy "members can read organizations"
  on public.organizations for select
  using (public.is_org_member(id));

create policy "members can read memberships"
  on public.organization_memberships for select
  using (public.is_org_member(tenant_id));

create policy "members can read source connections"
  on public.source_connections for select
  using (public.is_org_member(tenant_id));

create policy "admins can manage source connections"
  on public.source_connections for all
  using (public.can_manage_sources(tenant_id))
  with check (public.can_manage_sources(tenant_id));

create policy "members can read source documents"
  on public.source_documents for select
  using (public.is_org_member(tenant_id));

create policy "members can read chunks"
  on public.document_chunks for select
  using (public.is_org_member(tenant_id));

create policy "members can read ingestion runs"
  on public.ingestion_runs for select
  using (public.is_org_member(tenant_id));

create policy "admins can create ingestion runs"
  on public.ingestion_runs for insert
  with check (public.can_manage_sources(tenant_id));

create policy "members can read audit events"
  on public.audit_events for select
  using (public.is_org_member(tenant_id));
