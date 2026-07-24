-- A generated draft cannot be exported until an authorized tenant reviewer approves its immutable output hash.

create table if not exists public.tenant_draft_reviews (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  agent_run_id uuid not null unique references public.tenant_agent_runs(id) on delete cascade,
  opportunity_version_id uuid not null references public.platform_opportunity_versions(id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  output_hash text not null check (output_hash ~ '^[a-f0-9]{64}$'),
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  docx_blob_path text,
  docx_sha256 text,
  pdf_blob_path text,
  pdf_sha256 text,
  validation_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenant_draft_reviews_tenant_idx
  on public.tenant_draft_reviews(tenant_id, status, updated_at desc);

alter table public.tenant_draft_reviews enable row level security;

create policy "members can read tenant draft reviews"
  on public.tenant_draft_reviews for select
  using (public.is_org_member(tenant_id));

create policy "admins can review tenant drafts"
  on public.tenant_draft_reviews for update
  using (public.can_manage_sources(tenant_id))
  with check (public.can_manage_sources(tenant_id));

comment on table public.tenant_draft_reviews is
  'Tenant-isolated human decisions and private export artifacts for immutable draft-agent outputs.';
