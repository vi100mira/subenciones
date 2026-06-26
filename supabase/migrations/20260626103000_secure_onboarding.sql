-- ============================================================
-- Subvenciones RAG: secure entity onboarding, invitations, consent
-- Fecha: 2026-06-26
-- ============================================================

create table if not exists public.tenant_onboarding_requests (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.organizations(id) on delete set null,
  entity_name text not null,
  website_url text,
  legal_identifier text,
  territory text,
  requester_email text not null,
  admin_email text not null,
  status text not null default 'requested'
    check (status in ('requested', 'admin_invited', 'admin_verified', 'approved', 'rejected', 'expired')),
  request_context_json jsonb not null default '{}'::jsonb,
  created_by uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  expires_at timestamptz not null default (now() + interval '14 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenant_onboarding_requests_email_idx
  on public.tenant_onboarding_requests(lower(admin_email), status, created_at desc);

create table if not exists public.tenant_user_invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'analyst', 'member', 'reader')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked', 'expired')),
  token_hash text,
  invited_by uuid,
  accepted_by uuid,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now(),
  unique (tenant_id, email, status)
);

create index if not exists tenant_user_invitations_email_idx
  on public.tenant_user_invitations(lower(email), status, expires_at);

create table if not exists public.tenant_terms_acceptances (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  auth_user_id uuid not null,
  terms_version text not null,
  accepted_at timestamptz not null default now(),
  acceptance_context_json jsonb not null default '{}'::jsonb,
  unique (tenant_id, auth_user_id, terms_version)
);

create table if not exists public.tenant_data_consents (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  consent_type text not null
    check (consent_type in ('public_web_analysis', 'manual_upload', 'drive_connection', 'sharepoint_connection', 'ai_processing')),
  status text not null default 'pending' check (status in ('pending', 'granted', 'denied', 'revoked')),
  scope_json jsonb not null default '{}'::jsonb,
  granted_by uuid,
  granted_at timestamptz,
  revoked_by uuid,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tenant_data_consents_tenant_idx
  on public.tenant_data_consents(tenant_id, consent_type, status);

create table if not exists public.tenant_profile_suggestions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.organizations(id) on delete cascade,
  field_key text not null,
  suggested_value text not null,
  source_type text not null check (source_type in ('public_web', 'guided_interview', 'manual_entry', 'uploaded_document')),
  source_ref text,
  confidence text not null default 'low' check (confidence in ('low', 'medium', 'high')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'superseded')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tenant_profile_suggestions_tenant_idx
  on public.tenant_profile_suggestions(tenant_id, status, created_at desc);

alter table public.tenant_onboarding_requests enable row level security;
alter table public.tenant_user_invitations enable row level security;
alter table public.tenant_terms_acceptances enable row level security;
alter table public.tenant_data_consents enable row level security;
alter table public.tenant_profile_suggestions enable row level security;

create policy "platform admins manage onboarding requests"
  on public.tenant_onboarding_requests for all
  using (false)
  with check (false);

create policy "members can read invitations"
  on public.tenant_user_invitations for select
  using (public.is_org_member(tenant_id));

create policy "admins can manage invitations"
  on public.tenant_user_invitations for all
  using (public.can_manage_sources(tenant_id))
  with check (public.can_manage_sources(tenant_id));

create policy "members can read terms acceptances"
  on public.tenant_terms_acceptances for select
  using (public.is_org_member(tenant_id));

create policy "members can read consents"
  on public.tenant_data_consents for select
  using (public.is_org_member(tenant_id));

create policy "admins can manage consents"
  on public.tenant_data_consents for all
  using (public.can_manage_sources(tenant_id))
  with check (public.can_manage_sources(tenant_id));

create policy "members can read profile suggestions"
  on public.tenant_profile_suggestions for select
  using (public.is_org_member(tenant_id));

create policy "admins can review profile suggestions"
  on public.tenant_profile_suggestions for update
  using (public.can_manage_sources(tenant_id))
  with check (public.can_manage_sources(tenant_id));
