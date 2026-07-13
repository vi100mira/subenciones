-- Evidencia trazable para sugerencias producidas desde web pública.

alter table public.tenant_profile_suggestions
  add column if not exists source_document_id uuid
    references public.source_documents(id) on delete set null,
  add column if not exists evidence_excerpt text,
  add column if not exists source_sha256 text,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

create index if not exists tenant_profile_suggestions_evidence_idx
  on public.tenant_profile_suggestions(tenant_id, source_document_id, status);

create index if not exists tenant_profile_suggestions_source_hash_idx
  on public.tenant_profile_suggestions(tenant_id, source_sha256);
