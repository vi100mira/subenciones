-- Official supplementary bases can be proposed manually, but the radar may only
-- consume them after explicit platform review. The link persists per opportunity.

create table if not exists public.platform_supplementary_basis_sources (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
  source_url text not null check (source_url ~ '^https://'),
  document_role text not null
    check (document_role in ('regulatory', 'call', 'application_form')),
  source_authority text not null
    check (source_authority in ('official_registry', 'official_journal', 'issuing_body')),
  status text not null default 'proposed'
    check (status in ('proposed', 'approved', 'rejected')),
  proposal_note text,
  proposed_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_note text,
  last_verified_at timestamptz,
  last_verification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_id, source_url, document_role)
);

create index if not exists platform_supplementary_basis_sources_review_idx
  on public.platform_supplementary_basis_sources(status, updated_at desc);

create index if not exists platform_supplementary_basis_sources_opportunity_idx
  on public.platform_supplementary_basis_sources(opportunity_id, status);

alter table public.platform_supplementary_basis_sources enable row level security;

comment on table public.platform_supplementary_basis_sources is
  'Platform-public official basis URLs proposed and human-approved for reuse by future radar campaigns.';
