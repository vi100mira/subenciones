-- Decisiones humanas y avance de candidatura sobre recomendaciones de encaje.

alter table public.tenant_opportunity_recommendations
  add column if not exists decision_status text not null default 'pending',
  add column if not exists decision_reason text,
  add column if not exists decision_note text,
  add column if not exists candidacy_stage text not null default 'none',
  add column if not exists stage_updated_at timestamptz;

alter table public.tenant_opportunity_recommendations
  drop constraint if exists tenant_recommendations_decision_status_check,
  add constraint tenant_recommendations_decision_status_check
    check (decision_status in ('pending', 'preselected', 'dismissed')),
  drop constraint if exists tenant_recommendations_candidacy_stage_check,
  add constraint tenant_recommendations_candidacy_stage_check
    check (candidacy_stage in ('none', 'documents_pending', 'documents_ready', 'active', 'abandoned'));

update public.tenant_opportunity_recommendations
set decision_status = case human_review_status
  when 'reviewed' then 'preselected'
  when 'dismissed' then 'dismissed'
  else 'pending'
end
where decision_status = 'pending';

alter table public.tenant_agent_runs
  add column if not exists review_started_at timestamptz,
  add column if not exists review_completed_at timestamptz;

create index if not exists tenant_recommendations_decision_idx
  on public.tenant_opportunity_recommendations(tenant_id, decision_status, candidacy_stage, updated_at desc);

-- Las políticas RLS existentes siguen aislando lectura y mutación por tenant.
