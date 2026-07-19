# Sincronizacion inmediata de candidaturas

## Intencion

Mostrar en Candidatura una oportunidad en cuanto la preseleccion persistida se aplica en el navegador, sin exigir recargar la pagina.

## Archivos tocados

- `prototype/workspace-flow.js`: vuelve a renderizar el listado al recibir `tenant-recommendations-applied`.
- `prototype/index.html`: renueva la version del recurso para evitar una copia antigua en cache.
- `scripts/guardrails/check-tenant-match-contract.mjs`: protege el contrato de actualizacion inmediata.

## Verificacion

- `node scripts/guardrails/check-tenant-match-contract.mjs`: correcto.
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`: correcto.
- `node --check prototype/workspace-flow.js`: correcto.
- `npm run check:stability`: correcto; incluye tipado, tenant isolation, encaje, revision documental, evidencias, plan de documentos y exportacion gobernada.
- Front local y `GET /api/demo-tenant-status`: HTTP 200.
- La repeticion visual autenticada no se completo porque la recarga necesaria para tomar el nuevo recurso devolvio la pestaña a la pantalla de acceso; no se reutilizaron ni inspeccionaron credenciales.

## Riesgos residuales

- La actualizacion depende de que la API confirme la mutacion y de que el refresco posterior pueda recuperar el estado persistido; ante un fallo de red se conserva el mensaje de error existente y no se fabrica una candidatura local.
