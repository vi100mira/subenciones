-- ============================================================
-- Subvenciones RAG: opportunity versioning, changes, tenant alerts
-- Fecha: 2026-06-29
-- ============================================================

create extension if not exists pgcrypto;

create table if not exists public.platform_opportunities (
  id uuid primary key default gen_random_uuid(),
  platform_source_id uuid references public.platform_sources(id) on delete set null,
  canonical_key text not null unique,
  title text not null,
  funder_name text not null,
  source_scope text not null check (source_scope in ('platform_public', 'platform_curated')),
  funder_type text not null default 'unknown'
    check (funder_type in ('public', 'foundation', 'banking_foundation', 'corporate_foundation', 'company', 'federation', 'philanthropy', 'prize', 'challenge', 'unknown')),
  territory text,
  themes text[] not null default '{}',
  status text not null default 'tracked'
    check (status in ('tracked', 'open', 'closed', 'rolling', 'withdrawn', 'archived')),
  priority integer not null default 50,
  metadata_json jsonb not null default '{}'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_opportunities_source_idx
  on public.platform_opportunities(platform_source_id, status, priority desc);

create index if not exists platform_opportunities_scope_idx
  on public.platform_opportunities(source_scope, status, updated_at desc);

create table if not exists public.platform_opportunity_versions (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
  version_number integer not null,
  version_status text not null default 'current'
    check (version_status in ('current', 'superseded', 'withdrawn', 'uncertain')),
  source_url text not null,
  official_url text,
  bases_url text,
  deadline_start date,
  deadline_end date,
  deadline_text text,
  deadline_status text not null default 'uncertain'
    check (deadline_status in ('open', 'closed', 'rolling', 'uncertain')),
  deadline_confidence text not null default 'uncertain'
    check (deadline_confidence in ('high', 'medium', 'low', 'uncertain')),
  amount_text text,
  eligibility_text text,
  criteria_text text,
  required_documents_text text,
  submission_channel_text text,
  content_hash text not null,
  deadline_hash text not null,
  criteria_hash text not null,
  evidence_json jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (opportunity_id, version_number),
  unique (opportunity_id, content_hash)
);

create unique index if not exists platform_opportunity_one_current_idx
  on public.platform_opportunity_versions(opportunity_id)
  where version_status = 'current';

create index if not exists platform_opportunity_versions_deadline_idx
  on public.platform_opportunity_versions(deadline_status, deadline_end, deadline_confidence);

create table if not exists public.platform_opportunity_change_events (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
  previous_version_id uuid references public.platform_opportunity_versions(id) on delete set null,
  new_version_id uuid references public.platform_opportunity_versions(id) on delete set null,
  change_type text not null
    check (change_type in ('new_opportunity', 'deadline', 'eligibility', 'required_documents', 'budget', 'submission_channel', 'text_document', 'source_health', 'minor_metadata', 'withdrawn')),
  severity text not null
    check (severity in ('critical', 'high', 'medium', 'low')),
  confidence text not null default 'medium'
    check (confidence in ('high', 'medium', 'low', 'uncertain')),
  summary text not null,
  previous_value text,
  new_value text,
  evidence_json jsonb not null default '{}'::jsonb,
  human_review_status text not null default 'not_required'
    check (human_review_status in ('not_required', 'pending', 'reviewed', 'dismissed')),
  detected_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists platform_change_events_opportunity_idx
  on public.platform_opportunity_change_events(opportunity_id, detected_at desc);

create index if not exists platform_change_events_severity_idx
  on public.platform_opportunity_change_events(severity, human_review_status, detected_at desc);

create table if not exists public.tenant_opportunity_watches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
  reason text not null
    check (reason in ('candidate_workspace', 'recommended', 'saved_search', 'profile_match', 'draft_generated', 'manual_follow')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'archived')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tenant_id, opportunity_id, reason)
);

create index if not exists tenant_opportunity_watches_tenant_idx
  on public.tenant_opportunity_watches(tenant_id, status, reason);

create index if not exists tenant_opportunity_watches_opportunity_idx
  on public.tenant_opportunity_watches(opportunity_id, status);

create table if not exists public.tenant_change_alerts (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  opportunity_id uuid not null references public.platform_opportunities(id) on delete cascade,
  change_event_id uuid not null references public.platform_opportunity_change_events(id) on delete cascade,
  severity text not null
    check (severity in ('critical', 'high', 'medium', 'low')),
  status text not null default 'new'
    check (status in ('new', 'seen', 'reviewing', 'resolved', 'dismissed')),
  title text not null,
  message text not null,
  recommended_action text not null,
  safe_channel_summary text,
  channel_status text not null default 'in_app_only'
    check (channel_status in ('in_app_only', 'queued', 'sent', 'failed')),
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  seen_at timestamptz,
  resolved_at timestamptz,
  unique (tenant_id, change_event_id)
);

create index if not exists tenant_change_alerts_tenant_idx
  on public.tenant_change_alerts(tenant_id, status, severity, created_at desc);

create index if not exists tenant_change_alerts_event_idx
  on public.tenant_change_alerts(change_event_id);

alter table public.platform_opportunities enable row level security;
alter table public.platform_opportunity_versions enable row level security;
alter table public.platform_opportunity_change_events enable row level security;
alter table public.tenant_opportunity_watches enable row level security;
alter table public.tenant_change_alerts enable row level security;

create policy "members can read tenant opportunity watches"
  on public.tenant_opportunity_watches for select
  using (public.is_org_member(tenant_id));

create policy "members can manage tenant opportunity watches"
  on public.tenant_opportunity_watches for all
  using (public.is_org_member(tenant_id))
  with check (public.is_org_member(tenant_id));

create policy "members can read tenant change alerts"
  on public.tenant_change_alerts for select
  using (public.is_org_member(tenant_id));

create policy "members can update tenant change alerts"
  on public.tenant_change_alerts for update
  using (public.is_org_member(tenant_id))
  with check (public.is_org_member(tenant_id));
