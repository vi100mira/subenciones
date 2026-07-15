# Ciclo de investigación, encaje y control de datos

Fecha: 2026-07-14

## Intención

Evitar que el corpus general de oportunidades se interprete como encaje de Novaterra y aclarar que las políticas de datos son un control transversal, no un agente de análisis.

## Estado comprobado

- Novaterra tiene concedido `public_web_analysis` para `https://www.novaterra.org.es` y su fuente web está activa.
- El Investigador terminó una ejecución y generó 14 sugerencias.
- Las 14 sugerencias ya fueron revisadas: 8 aceptadas y 6 descartadas; el perfil está aprobado.
- `match_agent` está habilitado y el primer cálculo solicitado quedó persistido inicialmente como `queued`.

## Cambios

- Asistentes explica el ciclo radar → investigación → revisión de perfil → encaje.
- El estado del Investigador se carga desde el tenant y muestra la revisión pendiente.
- “Políticas de datos” pasa a “Control de datos”, identificado como control transversal que no calcula encaje.
- Un fallo al consultar el encaje ya no sobrescribe el estado global de todos los asistentes.
- Panel y Oportunidades distinguen corpus disponible de encaje calculado.
- El perfil no puede aprobarse mientras quede una sugerencia pendiente; al terminar aparece la acción final que habilita el encaje.
- La revisión individual evita incorporar falsos positivos observados en la prueba, como logotipos de terceros o menciones incidentales a otras asociaciones.
- Las cabeceras técnicas de las sugerencias se traducen a términos de negocio, con una explicación breve, confianza legible y acciones más claras.
- Los posibles logotipos incluyen una miniatura ampliable; solo se carga una imagen HTTPS del mismo dominio público que su evidencia.
- Tras aprobar el perfil, el panel cambia de forma persistente a “Completado”, resume decisiones aceptadas y descartadas y ofrece “Calcular encaje” como siguiente paso.
- Se añade separación vertical entre el perfil aprobado, su acción principal y las tarjetas inferiores.
- La API de encaje devuelve también la ejecución más reciente, separada de sus recomendaciones.
- Asistentes muestra si el encaje está en cola, calculando, disponible o fallido; evita lanzar duplicados y ofrece ir a resultados al terminar.
- Mientras el usuario está en Asistentes u Oportunidades, la aplicación comprueba el estado cada cinco segundos y comunica una sola vez la finalización.

## Archivos

- `prototype/agents-readiness.js`
- `prototype/tenant-agent-runtime.js`
- `prototype/tenant-recommendations-runtime.js`
- `prototype/mock-data.js`
- `prototype/app.js`
- `prototype/ui-polish.js`
- `prototype/stitch-theme.css`
- `prototype/index.html`
- `api/tenant-match-runs.ts`
- `api/tenant-profile-review.ts`
- `scripts/guardrails/check-runtime-truth-ui.mjs`
- `scripts/guardrails/check-tenant-match-contract.mjs`
- `docs/architecture/arquitectura-actual-del-sistema.md`
- `docs/product/master-context.md`
- `docs/product/agentic-architecture.md`

## Verificación

- Consulta de solo lectura a Supabase del tenant `novaterra-demo`.
- API local `/api/demo-tenant-status` responde correctamente tras reiniciar Vercel con el entorno cargado.
- La ejecución `e7c25bf7-e6b1-4bec-857f-ef0b15fab025` terminó en `review_required`: 89 recomendaciones persistidas (3 candidatas, 41 para revisar y 45 de bajo encaje), sin llamadas a IA externa.
- Recarga real en navegador local: se sirven los runtimes con versión `20260714-match-status` y no aparecen errores de consola.
- `npm run check:runtime-truth`
- `npm run check:ui`
- `npm run check:tenant-agents`
- `npm run check:entity-research`
- `npm run check:tenant-match`
- `npm run typecheck`
- `npm run check:line-budgets`

## Riesgo residual

- El entorno local no dispone de credenciales para el despacho inmediato del worker alojado; conserva la recuperación programada. La interfaz hace visible la espera y no interpreta una cola como resultado terminado.
- Las recomendaciones generadas siguen pendientes de revisión humana; el cálculo no decide elegibilidad ni realiza envíos.
