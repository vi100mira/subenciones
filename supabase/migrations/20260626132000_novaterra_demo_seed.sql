-- ============================================================
-- Subvenciones RAG: Novaterra demo tenant, non-sensitive seed
-- Fecha: 2026-06-26
-- ============================================================

with org as (
  insert into public.organizations (name, slug)
  values ('Novaterra demo', 'novaterra-demo')
  on conflict (slug) do update
    set name = excluded.name,
        updated_at = now()
  returning id
),
config as (
  insert into public.tenant_configs (
    tenant_id,
    display_name,
    primary_color,
    status,
    profile_json,
    motivations_json
  )
  select
    id,
    'Novaterra demo',
    '#2f766d',
    'onboarding',
    '{
      "legal_form": "Fundacion / entidad social",
      "territory": "Comunitat Valenciana",
      "collectives": ["personas en vulnerabilidad", "jovenes", "empleo"],
      "programs": ["insercion", "formacion", "acompanamiento"],
      "review_state": "pendiente_validacion_humana"
    }'::jsonb,
    '{
      "social_pricing": true,
      "pilot_scope": "demo no sensible",
      "human_review_required": true
    }'::jsonb
  from org
  on conflict (tenant_id) do update
    set display_name = excluded.display_name,
        primary_color = excluded.primary_color,
        status = excluded.status,
        profile_json = excluded.profile_json,
        motivations_json = excluded.motivations_json,
        updated_at = now()
  returning tenant_id
),
bdns_source as (
  insert into public.source_connections (
    tenant_id,
    label,
    kind,
    scope,
    status,
    health_status,
    priority,
    config_json,
    approved_at
  )
  select
    tenant_id,
    'BDNS/SNPSAP publico',
    'bdns',
    'tenant_public',
    'active',
    'healthy',
    95,
    '{"mode": "public_radar", "data_class": "public", "official_api": true}'::jsonb,
    now()
  from config
  where not exists (
    select 1 from public.source_connections s
    where s.tenant_id = config.tenant_id and s.label = 'BDNS/SNPSAP publico'
  )
  returning id, tenant_id
),
manual_source as (
  insert into public.source_connections (
    tenant_id,
    label,
    kind,
    scope,
    status,
    health_status,
    priority,
    config_json
  )
  select
    tenant_id,
    'Entrevista guiada demo',
    'manual_upload',
    'tenant_internal',
    'pending_approval',
    'unknown',
    70,
    '{"mode": "guided_interview", "data_class": "internal", "contains_personal_data": false}'::jsonb
  from config
  where not exists (
    select 1 from public.source_connections s
    where s.tenant_id = config.tenant_id and s.label = 'Entrevista guiada demo'
  )
  returning id, tenant_id
),
doc_seed as (
  insert into public.source_documents (
    tenant_id,
    source_connection_id,
    external_id,
    title,
    path,
    mime_type,
    data_class,
    source_sha256,
    extracted_text,
    extraction_status,
    metadata_json
  )
  select
    tenant_id,
    id,
    'novaterra-demo-profile-v1',
    'Perfil publico demo de Novaterra',
    'demo/novaterra/perfil-publico.md',
    'text/markdown',
    'public',
    '7c72d2fc8c4c42bf8ad57f4e547d17b10f37cc166c3c6ae8c80942c3e16d7566',
    'Entidad social demo orientada a insercion laboral, formacion y acompanamiento. Contenido no sensible para validar el flujo.',
    'ready',
    '{"origin": "seed_demo", "human_review": "pending"}'::jsonb
  from bdns_source
  on conflict (tenant_id, source_connection_id, external_id) do nothing
  returning tenant_id
),
consents as (
  insert into public.tenant_data_consents (
    tenant_id,
    consent_type,
    status,
    scope_json,
    granted_at
  )
  select
    tenant_id,
    'public_web_analysis',
    'pending',
    '{"reason": "pendiente de aprobacion del admin de entidad", "demo": true}'::jsonb,
    null
  from config
  where not exists (
    select 1 from public.tenant_data_consents c
    where c.tenant_id = config.tenant_id and c.consent_type = 'public_web_analysis'
  )
  returning tenant_id
)
insert into public.audit_events (
  tenant_id,
  actor_label,
  action,
  target_type,
  target_id,
  detail_json
)
select
  tenant_id,
  'system.seed',
  'tenant.demo_seeded',
  'organization',
  tenant_id::text,
  '{"contains_personal_data": false, "requires_human_validation": true}'::jsonb
from config
where not exists (
  select 1 from public.audit_events a
  where a.tenant_id = config.tenant_id and a.action = 'tenant.demo_seeded'
);
