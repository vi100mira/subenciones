# Agente documental: acceso histórico sin contratación

Fecha: 2026-07-24

## Intención

Separar la propiedad de los datos del tenant de la capacidad contratada. Un tenant sin `draft_agent` conserva acceso a su Base común y a sus candidaturas históricas, pero no puede ejecutar nuevas operaciones de preparación documental o consulta IA.

## Política aplicada

- Permitido sin el módulo: listar y abrir documentos existentes, consultar candidaturas y versiones históricas, descargar originales o borradores ya disponibles, y revocar consentimientos.
- Bloqueado sin el módulo: añadir o aprobar fuentes privadas, cargar o analizar archivos, crear propuestas de conocimiento, consultar la Base común mediante IA, proponer documentos para una candidatura, generar borradores y crear nuevas versiones.
- La revisión humana de resultados ya existentes se conserva para no encerrar los datos del tenant ni eliminar trazabilidad.
- Al volver a contratar `draft_agent`, las capacidades se reactivan sobre los datos existentes; no se exige reingestión.

## Archivos

- `src/tenantPlan.ts` y APIs de fuentes, conocimiento privado, candidatura, gobernanza y versiones: guardas de entitlement en las mutaciones que generan trabajo documental nuevo.
- `backend/app/services/private_knowledge.py`: la consulta local privada comprueba el plan antes de recuperar contenido.
- `prototype/tenant-plan.js`, `prototype/private-knowledge.js`, `prototype/common-knowledge-browser.js`, `prototype/candidature-document-selection.js` y `prototype/opportunity-requirements.js`: navegación histórica visible y modo solo lectura explícito.
- `scripts/guardrails/check-document-agent-plan-boundary.mjs` y pruebas relacionadas: cobertura del límite de plan, historial y flujo con plan completo.
- `package.json`: el nuevo guardrail forma parte de `check:stability`.

## Verificación

- `npm run check:document-agent-plan-boundary`
- `npm run typecheck`
- `npm run check:private-knowledge-bridge`
- `npm run check:private-knowledge`
- `npm run check:tenant-plan-ui`
- `npm run check:candidature-document-ui`
- `npm run check:draft-versions`
- `npm run check:draft-version-ui`
- Comprobación visual del estado de Base común en solo lectura mediante Playwright.

## Riesgos residuales

- El puente Python replica el catálogo de planes del runtime TypeScript; ambos deben mantenerse sincronizados hasta disponer de una fuente de entitlement única.
- La matriz actual se basa en los planes existentes y no introduce contratación a la carta de capacidades.
- No se ha realizado migración, despliegue ni cambio de datos de tenants.
