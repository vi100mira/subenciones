-- ============================================================
-- Subvenciones RAG: platform public sources and campaigns
-- Fecha: 2026-06-24
-- ============================================================

create table if not exists public.platform_sources (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  kind text not null check (kind in ('bdns', 'official_portal', 'gazette', 'private_funder', 'manual_curated')),
  url text,
  status text not null default 'active' check (status in ('active', 'paused', 'error', 'archived')),
  health_status text not null default 'unknown' check (health_status in ('unknown', 'healthy', 'degraded', 'error')),
  priority integer not null default 50,
  config_json jsonb not null default '{}'::jsonb,
  cursor_json jsonb,
  last_synced_at timestamptz,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_sources_status_idx
  on public.platform_sources(status, priority desc, updated_at desc);

create table if not exists public.platform_ingestion_campaigns (
  id uuid primary key default gen_random_uuid(),
  platform_source_id uuid not null references public.platform_sources(id) on delete cascade,
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed', 'cancelled')),
  scanned integer not null default 0,
  changed integer not null default 0,
  vectorized integer not null default 0,
  skipped integer not null default 0,
  failed integer not null default 0,
  error text,
  requested_by uuid,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists platform_campaigns_source_idx
  on public.platform_ingestion_campaigns(platform_source_id, created_at desc);
