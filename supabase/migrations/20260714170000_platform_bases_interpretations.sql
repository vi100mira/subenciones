-- Public bases are captured once, interpreted per immutable opportunity version,
-- and reused across tenants. Raw artifacts stay in Blob; only hashes and contracts live here.

create table if not exists public.platform_source_artifacts (
  id uuid primary key default gen_random_uuid(),
  opportunity_version_id uuid not null references public.platform_opportunity_versions(id) on delete cascade,
  source_url text not null,
  mime_type text not null,
  source_sha256 text not null check (source_sha256 ~ '^[a-f0-9]{64}$'),
  source_size_bytes bigint,
  original_blob_path text,
  extracted_text_blob_path text,
  page_count integer,
  extraction_status text not null default 'pending'
    check (extraction_status in ('pending', 'ready', 'ocr_required', 'blocked', 'error')),
  extraction_method text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_version_id, source_sha256)
);

create index if not exists platform_source_artifacts_version_idx
  on public.platform_source_artifacts(opportunity_version_id, extraction_status);

create table if not exists public.platform_bases_interpretations (
  id uuid primary key default gen_random_uuid(),
  opportunity_version_id uuid not null references public.platform_opportunity_versions(id) on delete cascade,
  source_artifact_id uuid not null references public.platform_source_artifacts(id) on delete restrict,
  interpreter_version text not null,
  status text not null default 'queued'
    check (status in ('queued', 'generating', 'review_required', 'approved', 'rejected', 'failed')),
  method text not null check (method in ('deterministic', 'openai', 'hybrid')),
  deterministic_json jsonb not null default '{}'::jsonb,
  contract_json jsonb not null default '{}'::jsonb,
  citations_verified boolean not null default false,
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  output_hash text,
  provider text,
  model text,
  usage_json jsonb not null default '{}'::jsonb,
  error text,
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (opportunity_version_id, source_artifact_id, interpreter_version)
);

create index if not exists platform_bases_interpretations_queue_idx
  on public.platform_bases_interpretations(status, created_at);

create index if not exists platform_bases_interpretations_version_idx
  on public.platform_bases_interpretations(opportunity_version_id, status, updated_at desc);

alter table public.platform_source_artifacts enable row level security;
alter table public.platform_bases_interpretations enable row level security;

comment on table public.platform_source_artifacts is
  'Platform-public immutable bases artifacts. Raw files and extracted page text remain in Blob.';
comment on table public.platform_bases_interpretations is
  'Versioned structured interpretation of official bases with verified citations and human review state.';
