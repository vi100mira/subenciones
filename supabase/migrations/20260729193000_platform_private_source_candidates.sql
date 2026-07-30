-- Public-source discovery queue. It never contains tenant data and is not a scanner input.
create table if not exists public.platform_private_source_candidates (
  id uuid primary key default gen_random_uuid(),
  dedupe_key text not null unique,
  organization_name text not null,
  official_url text not null check (official_url ~ '^https://'),
  official_domain text,
  source_kind text not null default 'private_funder' check (source_kind = 'private_funder'),
  funder_type text not null default 'unknown' check (funder_type in ('foundation', 'banking_foundation', 'corporate_foundation', 'company', 'federation', 'philanthropy', 'unknown')),
  territory text,
  themes_hint text,
  classification_json jsonb not null default '{}'::jsonb,
  provenance_json jsonb not null default '{}'::jsonb,
  convocation_evidence_json jsonb not null default '{}'::jsonb,
  review_status text not null default 'pending_review' check (review_status in ('pending_review', 'auto_approved', 'approved', 'rejected')),
  scanner_eligible boolean not null default false check (scanner_eligible = false or review_status = 'auto_approved'),
  publication_eligible boolean not null default false check (publication_eligible = false),
  auto_validation_json jsonb not null default '{}'::jsonb,
  audit_sample_required boolean not null default false,
  audit_status text not null default 'not_required' check (audit_status in ('not_required', 'pending', 'reviewed', 'dismissed')),
  review_note text,
  submitted_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_private_source_candidates_review_idx
  on public.platform_private_source_candidates(review_status, updated_at desc);

alter table public.platform_private_source_candidates enable row level security;

comment on table public.platform_private_source_candidates is
  'Platform-only queue for public private-funder leads and neutral call evidence. RLS has no tenant policy; only recorded conservative auto-validation can enable scanning, never publication.';
