-- ============================================================
-- Subvenciones RAG: tenants, sources, documents, chunks, audit
-- Fecha: 2026-06-24
-- ============================================================

create extension if not exists vector;
create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  auth_user_id uuid not null,
  role text not null check (role in ('owner', 'admin', 'analyst', 'member', 'reader')),
  status text not null default 'active' check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, auth_user_id)
);

create table if not exists public.source_connections (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('local_simulation', 'vercel_blob', 'google_drive', 'microsoft_graph', 'bdns', 'official_portal', 'private_funder', 'manual_upload')),
  scope text not null check (scope in ('platform_public', 'tenant_public', 'tenant_private', 'tenant_internal')),
  status text not null default 'pending_approval' check (status in ('pending_approval', 'active', 'paused', 'error', 'deleted')),
  health_status text not null default 'unknown' check (health_status in ('unknown', 'healthy', 'degraded', 'error')),
  priority integer not null default 50,
  config_json jsonb not null default '{}'::jsonb,
  cursor_json jsonb,
  last_synced_at timestamptz,
  created_by uuid,
  approved_by uuid,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists source_connections_tenant_idx
  on public.source_connections(tenant_id, status, priority desc);

create table if not exists public.source_documents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  source_connection_id uuid not null references public.source_connections(id) on delete cascade,
  external_id text not null,
  title text not null,
  path text not null,
  mime_type text not null,
  data_class text not null check (data_class in ('public', 'internal', 'personal', 'sensitive', 'blocked')),
  blob_url text,
  blob_path text,
  source_url text,
  source_sha256 text not null,
  source_size_bytes bigint,
  modified_at timestamptz,
  extracted_text text,
  extraction_status text not null default 'pending' check (extraction_status in ('pending', 'ready', 'blocked', 'error')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, source_connection_id, external_id)
);

create index if not exists source_documents_tenant_idx
  on public.source_documents(tenant_id, source_connection_id);

create index if not exists source_documents_sha_idx
  on public.source_documents(source_sha256);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  document_id uuid not null references public.source_documents(id) on delete cascade,
  chunk_index integer not null,
  text text not null,
  token_count integer,
  embedding vector(1536),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (document_id, chunk_index)
);

create index if not exists document_chunks_tenant_idx
  on public.document_chunks(tenant_id, document_id);

create index if not exists document_chunks_embedding_idx
  on public.document_chunks using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

create table if not exists public.ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  source_connection_id uuid not null references public.source_connections(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  scanned integer not null default 0,
  inserted integer not null default 0,
  updated integer not null default 0,
  skipped integer not null default 0,
  blocked integer not null default 0,
  error text,
  requested_by uuid,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid,
  actor_label text not null,
  action text not null,
  target_type text not null,
  target_id text not null,
  detail_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_events_tenant_created_idx
  on public.audit_events(tenant_id, created_at desc);
