# Borradores públicos sin consentimiento IA — 2026-07-16

## Intención

Separar el derecho de uso contratado del permiso para incorporar datos internos. El plan `Misión integral` habilita revisión de bases, plan documental y borradores construidos con evidencia pública; `ai_processing` amplía voluntariamente el contexto a hechos internos aprobados.

## Cambios

- `tenant-agent-runtime.js`: presenta el Gestor documental como operativo en modo público, enlaza con Candidatura y convierte la autorización de datos internos en opcional.
- `draft-agent-runs.ts`: conserva la puerta ya existente que exige consentimiento únicamente cuando `useApprovedInternalFacts` es verdadero.
- `draft-agent-runs.ts` y `draft-agent-ui.js`: impiden aprobar resultados heredados que no contengan documentos y plan documental revisables.
- `20260716122500_public_document_drafts_without_ai_consent.sql`: reconcilia el agente como operativo con clase `public` y amplía a `internal_approved` tras consentimiento.
- `tenant-plan.js` y `tenantPlan.ts`: explican la diferencia entre contratación, datos privados y revisión humana.

## Seguridad y revisión

- El cambio no autoriza conectores, datos personales ni datos sensibles.
- Los borradores siguen vinculados a bases oficiales aprobadas y a una versión vigente.
- La exportación continúa bloqueada hasta aprobación humana; la presentación automática sigue prohibida.

## Verificación

- La prueba de plan recorre `Misión integral` sin consentimiento interno, confirma el estado operativo del Gestor documental y abre Candidatura desde su acción principal.

## Estado remoto

- El Supabase enlazado tiene cinco migraciones documentales pendientes, además de esta corrección.
- El preflight bloquea aplicarlas sin confirmación explícita del propietario.
- La preparación de interpretaciones se ha probado en seco: 35 artefactos de financiadores privados, 43 del radar municipal y 11 del conjunto documental consolidado. No se ha escrito en Blob ni Supabase ni se ha llamado a IA.
