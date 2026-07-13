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
    select 1 from tenant_data_consents
    where tenant_id = target_tenant_id
      and consent_type = 'public_web_analysis'
      and status = 'granted'
  ) into web_consent;
  select exists (
    select 1 from tenant_data_consents
    where tenant_id = target_tenant_id
      and consent_type = 'ai_processing'
      and status = 'granted'
  ) into ai_consent;
  select exists (
    select 1 from source_connections
    where tenant_id = target_tenant_id
      and label = 'Web pública de la entidad'
      and status = 'active'
  ) into website_ready;
  select coalesce(profile_json->>'review_state', '') in ('approved', 'validated', 'aprobado')
    from tenant_configs
    where tenant_id = target_tenant_id
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
    jsonb_build_object(
      'allowed_data_classes', to_jsonb(definition.allowed_data_classes),
      'requires_human_review', definition.requires_human_review
    ),
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
    status = case
      when tenant_agent_configs.status in ('paused', 'disabled') then tenant_agent_configs.status
      else excluded.status
    end,
    enabled = case
      when tenant_agent_configs.status in ('paused', 'disabled') then false
      else excluded.enabled
    end,
    permissions_json = excluded.permissions_json,
    status_reason = case
      when tenant_agent_configs.status in ('paused', 'disabled') then tenant_agent_configs.status_reason
      else excluded.status_reason
    end,
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
create or replace function public.provision_tenant_agent_suite(
  blueprint jsonb,
  actor_user_id uuid,
  actor_label text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  provisioned_tenant_id uuid;
  tenant_slug text := lower(trim(blueprint->'entity'->>'slug'));
  tenant_name text := trim(blueprint->'entity'->>'name');
  display_name text := coalesce(nullif(trim(blueprint->'entity'->>'displayName'), ''), tenant_name);
  website_url text := nullif(trim(blueprint->'entity'->>'websiteUrl'), '');
  owner_user_id uuid;
begin
  if coalesce((blueprint->>'version')::integer, 0) <> 1 then
    raise exception 'Versión de blueprint no compatible';
  end if;
  if tenant_name = '' or tenant_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Nombre o slug de entidad inválido';
  end if;
  if website_url is not null and website_url !~ '^https://[^[:space:]]+$' then
    raise exception 'La web pública debe usar HTTPS';
  end if;

  insert into organizations (name, slug)
  values (tenant_name, tenant_slug)
  on conflict (slug) do update set name = excluded.name, updated_at = now()
  returning id into provisioned_tenant_id;

  insert into tenant_configs (
    tenant_id, display_name, primary_color, status,
    profile_json, motivations_json, created_by, updated_at
  ) values (
    provisioned_tenant_id,
    display_name,
    coalesce(nullif(blueprint->'entity'->>'primaryColor', ''), '#24515a'),
    'onboarding',
    coalesce(blueprint->'profile', '{}'::jsonb),
    coalesce(blueprint->'motivations', '{}'::jsonb),
    actor_user_id,
    now()
  )
  on conflict (tenant_id) do update set
    display_name = excluded.display_name,
    primary_color = excluded.primary_color,
    profile_json = excluded.profile_json,
    motivations_json = excluded.motivations_json,
    updated_at = now();

  if nullif(blueprint->>'ownerUserId', '') is not null then
    owner_user_id := (blueprint->>'ownerUserId')::uuid;
    insert into organization_memberships (tenant_id, auth_user_id, role, status)
    values (provisioned_tenant_id, owner_user_id, 'owner', 'active')
    on conflict (tenant_id, auth_user_id) do update set
      role = 'owner', status = 'active', updated_at = now();
  end if;

  insert into tenant_data_consents (tenant_id, consent_type, status, scope_json)
  select provisioned_tenant_id, requested.consent_type, 'pending', jsonb_build_object('blueprint_version', 1)
  from unnest(array['public_web_analysis', 'ai_processing']) requested(consent_type)
  where not exists (
    select 1 from tenant_data_consents existing
    where existing.tenant_id = provisioned_tenant_id
      and existing.consent_type = requested.consent_type
  );

  if website_url is not null then
    insert into source_connections (
      tenant_id, label, kind, scope, status, config_json, created_by
    )
    select provisioned_tenant_id, 'Web pública de la entidad', 'official_portal', 'tenant_public',
      'pending_approval', jsonb_build_object('base_url', website_url, 'same_domain_only', true), actor_user_id
    where not exists (
      select 1 from source_connections source
      where source.tenant_id = provisioned_tenant_id and source.label = 'Web pública de la entidad'
    );
  end if;

  perform reconcile_tenant_agent_suite(provisioned_tenant_id);

  insert into audit_events (
    tenant_id, actor_user_id, actor_label, action, target_type, target_id, detail_json
  ) values (
    provisioned_tenant_id, actor_user_id, actor_label, 'tenant.suite_provisioned',
    'organization', provisioned_tenant_id::text,
    jsonb_build_object('blueprint_version', 1, 'slug', tenant_slug, 'reprovisioned', true)
  );

  return jsonb_build_object(
    'tenantId', provisioned_tenant_id,
    'slug', tenant_slug,
    'status', 'onboarding',
    'agents', (
      select jsonb_agg(jsonb_build_object(
        'agentKey', config.agent_key,
        'status', config.status,
        'enabled', config.enabled,
        'reason', config.status_reason
      ) order by config.agent_key)
      from tenant_agent_configs config
      where config.tenant_id = provisioned_tenant_id
    )
  );
end;
$$;

revoke all on function public.provision_tenant_agent_suite(jsonb, uuid, text) from public, anon, authenticated;
revoke all on function public.reconcile_tenant_agent_suite(uuid) from public, anon, authenticated;
grant execute on function public.provision_tenant_agent_suite(jsonb, uuid, text) to service_role;
grant execute on function public.reconcile_tenant_agent_suite(uuid) to service_role;
