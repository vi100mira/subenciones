-- Technical lifecycle for the global radar. It never approves grant content or tenant applicability.

alter table public.platform_private_source_candidates
  add column if not exists technical_state text not null default 'legacy_unclassified'
    check (technical_state in ('legacy_unclassified', 'automated_evidence_checked', 'operational_exception', 'operational_hold', 'rejected_security')),
  add column if not exists technical_reason text,
  add column if not exists technical_evidence_json jsonb not null default '{}'::jsonb,
  add column if not exists technical_updated_at timestamptz;

alter table public.platform_opportunities
  add column if not exists technical_state text not null default 'legacy_unclassified'
    check (technical_state in ('legacy_unclassified', 'automated_evidence_checked', 'operational_exception', 'operational_hold')),
  add column if not exists technical_reason text,
  add column if not exists technical_evidence_json jsonb not null default '{}'::jsonb,
  add column if not exists technical_updated_at timestamptz;

-- Preserve historic candidate statuses without inferring anything about grant eligibility.
update public.platform_private_source_candidates
set technical_state = case
  when review_status = 'auto_approved' then 'automated_evidence_checked'
  when review_status = 'rejected' then 'rejected_security'
  else 'operational_exception'
end,
technical_reason = coalesce(technical_reason, 'migration_existing_candidate_status'),
technical_evidence_json = case when technical_evidence_json = '{}'::jsonb then coalesce(auto_validation_json, '{}'::jsonb) else technical_evidence_json end,
technical_updated_at = coalesce(technical_updated_at, updated_at);

create table if not exists public.platform_radar_operation_events (
  id uuid primary key default gen_random_uuid(),
  resource_type text not null check (resource_type in ('private_source_candidate', 'opportunity')),
  resource_id uuid not null,
  transition text not null check (transition in ('automatic_evidence_check', 'flag_operational_exception', 'clear_operational_exception', 'place_security_hold')),
  from_state text not null,
  to_state text not null,
  actor_scope text not null check (actor_scope in ('system', 'platform_superadmin')),
  actor_user_id uuid,
  reason text not null,
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists platform_radar_operation_resource_idx
  on public.platform_radar_operation_events(resource_id, created_at desc);

create or replace function public.record_opportunity_technical_transition()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.technical_state <> 'legacy_unclassified' then
    insert into public.platform_radar_operation_events (
      resource_type, resource_id, transition, from_state, to_state, actor_scope, reason, evidence_json
    ) values (
      'opportunity', new.id, case when new.technical_state = 'operational_exception' then 'flag_operational_exception' else 'automatic_evidence_check' end,
      'legacy_unclassified', new.technical_state, 'system', coalesce(new.technical_reason, 'technical_state_created'), new.technical_evidence_json
    );
  elsif tg_op = 'UPDATE' and new.technical_state is distinct from old.technical_state then
    insert into public.platform_radar_operation_events (
      resource_type, resource_id, transition, from_state, to_state, actor_scope, reason, evidence_json
    ) values (
      'opportunity', new.id, case when new.technical_state = 'operational_exception' then 'flag_operational_exception' else 'automatic_evidence_check' end,
      old.technical_state, new.technical_state, 'system', coalesce(new.technical_reason, 'technical_state_changed'), new.technical_evidence_json
    );
  end if;
  return new;
end;
$$;

drop trigger if exists platform_opportunity_technical_transition on public.platform_opportunities;
create trigger platform_opportunity_technical_transition
  after insert or update on public.platform_opportunities
  for each row execute function public.record_opportunity_technical_transition();

alter table public.platform_radar_operation_events enable row level security;

comment on table public.platform_radar_operation_events is
  'Immutable technical source-operation events. No opportunity, bases interpretation, eligibility, matching, alert or publication transition is permitted.';
comment on column public.platform_opportunities.technical_state is
  'Objective technical evidence state only; tenant specialists decide interpretation, eligibility, relevance and application.';
