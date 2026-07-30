-- Read-only verification for the empty-project bootstrap. Run after the approved migration path.
begin read only;

with expected(table_name) as (
  values
    ('organizations'), ('organization_memberships'), ('source_connections'), ('source_documents'),
    ('document_chunks'), ('ingestion_runs'), ('audit_events'), ('tenant_configs'),
    ('platform_sources'), ('platform_ingestion_campaigns'), ('tenant_onboarding_requests'),
    ('tenant_user_invitations'), ('tenant_terms_acceptances'), ('tenant_data_consents'),
    ('tenant_profile_suggestions'), ('platform_opportunities'), ('platform_opportunity_versions'),
    ('platform_opportunity_change_events'), ('tenant_opportunity_watches'), ('tenant_change_alerts'),
    ('tenant_agent_runs'), ('platform_agent_definitions'), ('tenant_agent_configs'),
    ('tenant_opportunity_recommendations'), ('tenant_document_reviews'), ('platform_source_artifacts'),
    ('platform_bases_interpretations'), ('tenant_draft_reviews'), ('platform_supplementary_basis_sources'),
    ('tenant_bases_acceptances'), ('tenant_draft_versions'), ('tenant_candidature_documents'),
    ('tenant_candidature_working_exports'), ('platform_private_source_candidates'),
    ('platform_radar_operation_events')
)
select expected.table_name, (tables.table_name is not null) as present
from expected
left join information_schema.tables tables
  on tables.table_schema = 'public' and tables.table_name = expected.table_name
order by expected.table_name;

with expected(table_name) as (
  values
    ('organizations'), ('organization_memberships'), ('source_connections'), ('source_documents'),
    ('document_chunks'), ('ingestion_runs'), ('audit_events'), ('tenant_configs'),
    ('platform_sources'), ('platform_ingestion_campaigns'), ('tenant_onboarding_requests'),
    ('tenant_user_invitations'), ('tenant_terms_acceptances'), ('tenant_data_consents'),
    ('tenant_profile_suggestions'), ('platform_opportunities'), ('platform_opportunity_versions'),
    ('platform_opportunity_change_events'), ('tenant_opportunity_watches'), ('tenant_change_alerts'),
    ('tenant_agent_runs'), ('platform_agent_definitions'), ('tenant_agent_configs'),
    ('tenant_opportunity_recommendations'), ('tenant_document_reviews'), ('platform_source_artifacts'),
    ('platform_bases_interpretations'), ('tenant_draft_reviews'), ('platform_supplementary_basis_sources'),
    ('tenant_bases_acceptances'), ('tenant_draft_versions'), ('tenant_candidature_documents'),
    ('tenant_candidature_working_exports'), ('platform_private_source_candidates'),
    ('platform_radar_operation_events')
)
select expected.table_name, coalesce(classes.relrowsecurity, false) as rls_enabled
from expected
left join pg_class classes on classes.relname = expected.table_name
left join pg_namespace namespaces on namespaces.oid = classes.relnamespace and namespaces.nspname = 'public'
order by expected.table_name;

with closed_platform_tables(table_name) as (
  values
    ('platform_sources'), ('platform_ingestion_campaigns'), ('platform_opportunities'),
    ('platform_opportunity_versions'), ('platform_opportunity_change_events'),
    ('platform_source_artifacts'), ('platform_bases_interpretations'),
    ('platform_supplementary_basis_sources'), ('platform_private_source_candidates'),
    ('platform_radar_operation_events')
)
select closed_platform_tables.table_name, count(policies.policyname) as direct_client_policy_count
from closed_platform_tables
left join pg_policies policies
  on policies.schemaname = 'public' and policies.tablename = closed_platform_tables.table_name
group by closed_platform_tables.table_name
order by closed_platform_tables.table_name;

select
  to_regprocedure('public.reconcile_tenant_agent_suite(uuid)') as reconcile_function,
  has_function_privilege('service_role', 'public.reconcile_tenant_agent_suite(uuid)', 'execute') as service_role_can_execute,
  has_function_privilege('authenticated', 'public.reconcile_tenant_agent_suite(uuid)', 'execute') as authenticated_can_execute,
  has_function_privilege('anon', 'public.reconcile_tenant_agent_suite(uuid)', 'execute') as anon_can_execute,
  to_regprocedure('public.provision_tenant_agent_suite(jsonb,uuid,text)') as provision_function,
  has_function_privilege('service_role', 'public.provision_tenant_agent_suite(jsonb,uuid,text)', 'execute') as provision_service_role_can_execute,
  has_function_privilege('authenticated', 'public.provision_tenant_agent_suite(jsonb,uuid,text)', 'execute') as provision_authenticated_can_execute,
  has_function_privilege('anon', 'public.provision_tenant_agent_suite(jsonb,uuid,text)', 'execute') as provision_anon_can_execute;

select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'platform_private_source_candidates' and column_name in ('technical_state', 'technical_reason', 'technical_evidence_json', 'technical_updated_at'))
    or (table_name = 'platform_opportunities' and column_name in ('technical_state', 'technical_reason', 'technical_evidence_json', 'technical_updated_at'))
  )
order by table_name, column_name;

select trigger_name, event_manipulation, action_timing
from information_schema.triggers
where trigger_schema = 'public' and trigger_name = 'platform_opportunity_technical_transition';

select
  (select count(*) from public.organizations) as organizations,
  (select count(*) from public.platform_sources) as platform_sources,
  (select count(*) from public.platform_ingestion_campaigns) as ingestion_campaigns,
  (select count(*) from public.platform_opportunities) as opportunities,
  (select count(*) from public.platform_private_source_candidates) as private_candidates,
  (select count(*) from public.tenant_change_alerts) as tenant_alerts,
  (select count(*) from public.platform_agent_definitions) as platform_agent_definitions;

rollback;
