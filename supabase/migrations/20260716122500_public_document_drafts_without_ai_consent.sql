-- Contracted documentary work is available with platform-public evidence.
-- Consent only expands the draft context to tenant-approved internal facts.

create or replace function public.reconcile_tenant_agent_suite(target_tenant_id uuid)
returns table (agent_key text, status text, enabled boolean, status_reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  web_consent boolean;
  ai_consent boolean;
  website_ready boolean;
  profile_ready boolean;
begin
  select exists (
    select 1 from tenant_data_consents consent
    where consent.tenant_id = target_tenant_id
      and consent.consent_type = 'public_web_analysis'
      and consent.status = 'granted'
  ) into web_consent;
  select exists (
    select 1 from tenant_data_consents consent
    where consent.tenant_id = target_tenant_id
      and consent.consent_type = 'ai_processing'
      and consent.status = 'granted'
  ) into ai_consent;
  select exists (
    select 1 from source_connections source
    where source.tenant_id = target_tenant_id
      and source.label = 'Web pública de la entidad'
      and source.status = 'active'
  ) into website_ready;
  select coalesce(config.profile_json->>'review_state', '') in ('approved', 'validated', 'aprobado')
    from tenant_configs config
    where config.tenant_id = target_tenant_id
    into profile_ready;

  insert into tenant_agent_configs (
    tenant_id, agent_key, status, enabled, permissions_json,
    status_reason, provisioned_version, activated_at, last_verified_at, updated_at
  )
  select
    target_tenant_id,
    definition.agent_key,
    case
      when definition.agent_key in ('grant_search', 'document_review', 'draft_agent', 'alert_agent') then 'ready'
      when definition.agent_key = 'entity_research' and web_consent and website_ready then 'ready'
      when definition.agent_key = 'match_agent' and profile_ready then 'ready'
      else 'blocked'
    end,
    case
      when definition.agent_key in ('grant_search', 'document_review', 'draft_agent', 'alert_agent') then true
      when definition.agent_key = 'entity_research' then web_consent and website_ready
      when definition.agent_key = 'match_agent' then profile_ready
      else false
    end,
    jsonb_build_object(
      'allowed_data_classes',
      case
        when definition.agent_key = 'draft_agent' and not ai_consent then '["public"]'::jsonb
        else to_jsonb(definition.allowed_data_classes)
      end,
      'requires_human_review', definition.requires_human_review,
      'internal_data_consent', case when definition.agent_key = 'draft_agent' then ai_consent else null end
    ),
    case
      when definition.agent_key = 'entity_research' and not web_consent then 'Falta consentimiento de web pública'
      when definition.agent_key = 'entity_research' and not website_ready then 'Falta aprobar la fuente web'
      when definition.agent_key = 'match_agent' and not profile_ready then 'Falta aprobar el perfil de entidad'
      when definition.agent_key = 'draft_agent' and not ai_consent then 'Operativo con bases públicas; datos internos no autorizados'
      else 'Capacidad verificada'
    end,
    definition.catalog_version,
    case
      when definition.agent_key in ('grant_search', 'document_review', 'draft_agent', 'alert_agent') then now()
      when definition.agent_key = 'entity_research' and web_consent and website_ready then now()
      when definition.agent_key = 'match_agent' and profile_ready then now()
      else null
    end,
    now(),
    now()
  from platform_agent_definitions definition
  where definition.active
  on conflict on constraint tenant_agent_configs_pkey do update set
    status = case when tenant_agent_configs.status in ('paused', 'disabled') then tenant_agent_configs.status else excluded.status end,
    enabled = case when tenant_agent_configs.status in ('paused', 'disabled') then false else excluded.enabled end,
    permissions_json = excluded.permissions_json,
    status_reason = case when tenant_agent_configs.status in ('paused', 'disabled') then tenant_agent_configs.status_reason else excluded.status_reason end,
    provisioned_version = excluded.provisioned_version,
    activated_at = coalesce(tenant_agent_configs.activated_at, excluded.activated_at),
    last_verified_at = excluded.last_verified_at,
    updated_at = excluded.updated_at;

  return query
    select config.agent_key, config.status, config.enabled, config.status_reason
    from tenant_agent_configs config
    where config.tenant_id = target_tenant_id
    order by config.agent_key;
end;
$$;

update public.platform_agent_definitions
set runtime_contract_json = runtime_contract_json || '{"public_drafting":"included","internal_facts_requires_consent":"ai_processing"}'::jsonb,
    updated_at = now()
where agent_key = 'draft_agent';

revoke all on function public.reconcile_tenant_agent_suite(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_tenant_agent_suite(uuid) to service_role;

do $$
declare
  tenant record;
begin
  for tenant in
    select tenant_id from public.tenant_configs where status in ('onboarding', 'active')
  loop
    perform 1 from public.reconcile_tenant_agent_suite(tenant.tenant_id);
  end loop;
end;
$$;
