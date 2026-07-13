-- Aclara la función visible sin cambiar la clave estable ni sus permisos.
update public.platform_agent_definitions
set display_name = 'Gestor documental',
    catalog_version = catalog_version + 1,
    updated_at = now()
where agent_key = 'draft_agent'
  and display_name is distinct from 'Gestor documental';
