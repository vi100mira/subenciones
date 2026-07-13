-- Corrige referencias ambiguas entre columnas y nombres de salida PL/pgSQL.

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
      when definition.agent_key in ('grant_search', 'document_review', 'alert_agent') then 'ready'
      when definition.agent_key = 'entity_research' and web_consent and website_ready then 'ready'
      when definition.agent_key = 'match_agent' and profile_ready then 'ready'
      when definition.agent_key = 'draft_agent' and ai_consent then 'ready'
      else 'blocked'
    end,
    case
      when definition.agent_key in ('grant_search', 'document_review', 'alert_agent') then true
      when definition.agent_key = 'entity_research' then web_consent and website_ready
      when definition.agent_key = 'match_agent' then profile_ready
      when definition.agent_key = 'draft_agent' then ai_consent
      else false
    end,
    jsonb_build_object('allowed_data_classes', to_jsonb(definition.allowed_data_classes), 'requires_human_review', definition.requires_human_review),
    case
      when definition.agent_key = 'entity_research' and not web_consent then 'Falta consentimiento de web pública'
      when definition.agent_key = 'entity_research' and not website_ready then 'Falta aprobar la fuente web'
      when definition.agent_key = 'match_agent' and not profile_ready then 'Falta aprobar el perfil de entidad'
      when definition.agent_key = 'draft_agent' and not ai_consent then 'Falta consentimiento de procesamiento IA'
      else 'Capacidad verificada'
    end,
    definition.catalog_version,
    case
      when definition.agent_key in ('grant_search', 'document_review', 'alert_agent') then now()
      when definition.agent_key = 'entity_research' and web_consent and website_ready then now()
      when definition.agent_key = 'match_agent' and profile_ready then now()
      when definition.agent_key = 'draft_agent' and ai_consent then now()
      else null
    end,
    now(),
    now()
  from platform_agent_definitions definition
  where definition.active
  on conflict (tenant_id, agent_key) do update set
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

revoke all on function public.reconcile_tenant_agent_suite(uuid) from public, anon, authenticated;
grant execute on function public.reconcile_tenant_agent_suite(uuid) to service_role;
