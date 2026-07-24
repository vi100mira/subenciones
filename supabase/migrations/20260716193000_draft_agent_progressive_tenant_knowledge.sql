-- Mantiene una sola capacidad comercial y declara sus dos especialidades internas.
update public.platform_agent_definitions
set display_name = 'Preparación documental',
    runtime_contract_json = jsonb_build_object(
      'worker', 'draft_agent',
      'output', 'review_required_draft',
      'capabilities', jsonb_build_array('tenant_knowledge_curator', 'document_drafter'),
      'learning_mode', 'approved_tenant_knowledge_only',
      'requires_human_review', true,
      'external_submission_allowed', false
    ),
    catalog_version = catalog_version + 1,
    updated_at = now()
where agent_key = 'draft_agent'
  and (
    display_name is distinct from 'Preparación documental'
    or runtime_contract_json ->> 'learning_mode' is distinct from 'approved_tenant_knowledge_only'
  );
