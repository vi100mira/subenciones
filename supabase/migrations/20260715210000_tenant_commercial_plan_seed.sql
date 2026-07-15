-- Commercial entitlements are tenant configuration, not payment evidence.
-- The future payment provider must write a separate signed/audited subscription event.
update public.tenant_configs as config
set motivations_json = jsonb_set(
      coalesce(config.motivations_json, '{}'::jsonb),
      '{commercial_plan}',
      '{"code":"mission_full","billing_mode":"sponsored","current_monthly_eur":0}'::jsonb,
      true
    ),
    updated_at = now()
from public.organizations as organization
where organization.id = config.tenant_id
  and organization.slug = 'novaterra-demo';
