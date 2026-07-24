-- Subconjunto documental privado seleccionado para una candidatura.
-- La Base común sigue siendo el corpus; esta tabla conserva solo vínculos revisables.

create unique index if not exists tenant_recommendations_tenant_id_unique
  on public.tenant_opportunity_recommendations(tenant_id, id);

create unique index if not exists source_documents_tenant_id_unique
  on public.source_documents(tenant_id, id);

create table if not exists public.tenant_candidature_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  recommendation_id uuid not null,
  source_document_id uuid not null,
  selection_origin text not null
    check (selection_origin in ('assistant_recommended', 'human_added')),
  selection_status text not null default 'proposed'
    check (selection_status in ('proposed', 'confirmed', 'excluded')),
  reason_text text not null check (char_length(reason_text) between 3 and 1000),
  evidence_json jsonb not null default '[]'::jsonb
    check (jsonb_typeof(evidence_json) = 'array'),
  proposed_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, recommendation_id, source_document_id),
  foreign key (tenant_id, recommendation_id)
    references public.tenant_opportunity_recommendations(tenant_id, id) on delete cascade,
  foreign key (tenant_id, source_document_id)
    references public.source_documents(tenant_id, id) on delete restrict,
  check (
    (selection_status = 'proposed' and reviewed_by is null and reviewed_at is null)
    or
    (selection_status in ('confirmed', 'excluded') and reviewed_by is not null and reviewed_at is not null)
  )
);

create index if not exists tenant_candidature_documents_status_idx
  on public.tenant_candidature_documents(
    tenant_id, recommendation_id, selection_status, updated_at desc
  );

alter table public.tenant_candidature_documents enable row level security;

create policy "members can read candidature document selections"
  on public.tenant_candidature_documents for select
  using (public.is_org_member(tenant_id));

comment on table public.tenant_candidature_documents is
  'Tenant-private links from one candidature recommendation to a small, evidenced and human-reviewed subset of the common document library. Mutations are owned by audited server APIs.';

comment on column public.tenant_candidature_documents.evidence_json is
  'References and requirement identifiers only; never copied private document content.';
