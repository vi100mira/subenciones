# Flujo de revisión humana del encaje

Fecha: 2026-07-14

## Intención

Consolidar el paso desde un resultado de encaje hasta una candidatura operativa, distinguiendo recomendación automática, decisión del validador y preparación documental.

## Cambios

- Candidatura deja de completar huecos con expedientes de ejemplo: solo muestra preselecciones humanas persistidas.
- Oportunidades distingue carga, disponibilidad y fallo del encaje; el corpus general ya no se presenta como estado real de la entidad.
- Si la sesion caduca, ambas vistas lo comunican y ocultan candidaturas locales potencialmente obsoletas.

- Se persisten por tenant el inicio y la finalización de la revisión.
- Cada recomendación admite decisión pendiente, preseleccionada o descartada.
- Un descarte exige motivo y admite una nota; queda auditado con actor y fecha.
- La candidatura avanza por documentación pendiente, documentación preparada y proyecto activo.
- Una candidatura avanzada se abandona, pero no pierde documentos ni historial.
- Los dos accesos de Asistentes comparten el mismo estado: Revisar resultados, Continuar revisión o Ver decisiones.
- Oportunidades muestra progreso y aclara que consultar no significa aprobar.
- Se eliminan las cuatro preselecciones automáticas del prototipo; las nuevas serán decisiones explícitas.

## Archivos principales

- `supabase/migrations/20260714113000_tenant_match_human_workflow.sql`
- `api/tenant-match-runs.ts`
- `api/tenant-match-review.ts`
- `prototype/tenant-match-review.js`
- `prototype/tenant-recommendations-runtime.js`
- `prototype/tenant-agent-runtime.js`
- `prototype/ui-polish.js`
- `prototype/workspace-flow.js`
- `prototype/opportunity-requirements.js`
- `scripts/guardrails/check-tenant-match-contract.mjs`
- `scripts/guardrails/check-runtime-truth-ui.mjs`

## Privacidad y control

- No se incorporan servicios externos ni se realizan llamadas de IA.
- Las decisiones quedan aisladas por tenant y usan las políticas RLS existentes.
- El flujo no determina elegibilidad ni presenta candidaturas automáticamente.
- Los documentos y la evidencia se conservan al abandonar una candidatura.

## Verificación

- Migración `20260714113000` aplicada al Supabase enlazado; `db lint` sin errores.
- Novaterra conserva 89 recomendaciones como `pending:none:pending`, sin revisión iniciada ni preselecciones atribuidas.
- `npm run check:tenant-match`
- `npm run check:runtime-truth`
- `npm run check:ui`
- `npm run typecheck`
- `npm run check:line-budgets`
- Navegador local carga los runtimes `human-review-workflow-2` y la sincronización final de Asistentes `human-review-workflow-3`, sin errores de consola.

## Riesgo residual

- La sesión autenticada disponible está en el navegador externo del usuario; la comprobación automatizada local verificó carga y contratos, pero no tomó decisiones para evitar iniciar la revisión o alterar recomendaciones en nombre del validador.
