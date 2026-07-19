# Solicitud de revisión de bases desde tenant

## Intención

Eliminar el bloqueo engañoso que pedía al tenant aprobar unas bases públicas globales sin darle una acción posible. El tenant ahora puede solicitar la revisión, consultar qué falta y seguir trabajando sin asumir permisos de plataforma.

## Archivos tocados

- `api/bases-review-request.ts`: consulta el estado real de la versión, recupera la última solicitud y registra una nueva en `audit_events`, deduplicada durante 24 horas.
- `prototype/opportunity-requirements.js`: sustituye el botón deshabilitado por acciones operativas, recupera el estado tras recargar y muestra la fecha de solicitud.
- `prototype/help-assistant-knowledge.js`: documenta el flujo para que Guía pueda explicarlo.
- `scripts/guardrails/check-opportunity-grid-ui.mjs`: evita que reaparezca el callejón sin salida.

## Privacidad y aislamiento

La solicitud solo registra identificadores y estado operativo. No mueve documentos privados ni permite que un tenant apruebe interpretaciones que se compartirán con otros tenants.

## Verificación

- `npm run typecheck`.
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`.
- `npm run check:help-assistant`.
- `node scripts/guardrails/check-draft-version-ui.mjs`: confirma que la solicitud está habilitada, persiste tras recargar con su fecha, muestra el estado de cola y que `Ver qué falta` abre `Documentos`.
- Endpoint local compilado y protegido: una llamada sin sesión devuelve `401 No autorizado`.

## Riesgo residual

La solicitud no acelera por sí misma el worker de extracción. La plataforma debe completar la lectura y verificar las citas antes de habilitar la aprobación.
