-- Validación experta de bases por tenant. Las mutaciones pasan por API
-- servidor para fijar actor, versión, hash contractual y auditoría.

create table if not exists public.tenant_bases_acceptances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_version_id uuid not null references public.platform_opportunity_versions(id) on delete cascade,
  status text not null default 'accepted'
    check (status in ('accepted', 'discrepancy_reported')),
  interpretation_ids uuid[] not null default '{}'
    check (status <> 'accepted' or cardinality(interpretation_ids) > 0),
  contract_hash text not null
    check (contract_hash ~ '^[a-f0-9]{64}$'),
  note text not null default ''
    check (status <> 'discrepancy_reported' or length(btrim(note)) > 0),
  accepted_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, opportunity_version_id)
);

create index if not exists tenant_bases_acceptances_tenant_idx
  on public.tenant_bases_acceptances(tenant_id, status, updated_at desc);

create index if not exists tenant_bases_acceptances_version_idx
  on public.tenant_bases_acceptances(opportunity_version_id, status);

alter table public.tenant_bases_acceptances enable row level security;

create or replace function public.set_tenant_bases_acceptance_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tenant_bases_acceptances_set_updated_at
  on public.tenant_bases_acceptances;
create trigger tenant_bases_acceptances_set_updated_at
  before update on public.tenant_bases_acceptances
  for each row execute function public.set_tenant_bases_acceptance_updated_at();

create policy "members can read tenant bases acceptances"
  on public.tenant_bases_acceptances for select
  using (public.is_org_member(tenant_id));

comment on table public.tenant_bases_acceptances is
  'Tenant-private expert decisions. Client writes stay denied; audited server APIs own all mutations.';
