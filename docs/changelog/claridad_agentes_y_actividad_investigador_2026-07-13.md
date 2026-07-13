# Claridad de agentes y actividad del Investigador

## Intención

Explicar la cobertura privada del radar, mostrar el progreso persistido del Investigador y hacer visible que Encaje depende de un perfil investigado y aprobado por una persona. «Borrador de memoria» pasa a llamarse «Gestor documental» sin cambiar la clave ni los permisos del agente.

## Archivos

- `prototype/mock-data.js`, `prototype/agents-readiness.js` y `prototype/platform-coverage-data.js`: lenguaje de cobertura pública/privada y nombres operativos.
- `prototype/tenant-agent-runtime.js`: consulta ejecuciones reales, muestra cola/resultado y enlaza la revisión del perfil con Encaje.
- `supabase/migrations/20260713213000_rename_draft_agent_document_manager.sql`: actualiza solo el nombre visible del catálogo.

## Privacidad y revisión

- Las fuentes privadas mencionadas son convocatorias abiertas publicadas por financiadores; no son documentos privados del tenant.
- El Investigador conserva `public_only`, consentimiento web y revisión humana.
- Encaje sigue bloqueado hasta aprobar el perfil; no se aprueban sugerencias automáticamente.

## Verificación

- `npm run check:stability`: correcto.
- `git diff --check`: correcto.
- Consulta productiva de solo lectura: 1 ejecución `review_required`, 11 páginas y 14 sugerencias pendientes; Encaje permanece bloqueado hasta aprobar el perfil.

## Riesgo residual

- El refresco de estado consulta cada 12 segundos únicamente mientras la pantalla de Asistentes está abierta.
