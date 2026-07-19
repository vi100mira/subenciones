# Control de ejecución en Asistentes — 2026-07-18

## Intención

Dar al analista una lectura uniforme de cómo se activa cada capacidad, cuándo se ejecutó por última vez, quién la solicitó y cuál es el siguiente disparador real, sin presentar automatizaciones ficticias ni programar acceso silencioso a datos privados.

## Cambios

- `api/tenant-agent-governance.ts` agrega política y última ejecución tenant-scoped al contrato de gobierno.
- `prototype/tenant-agent-runtime.js` y `prototype/stitch-theme.css` muestran `Modo`, `Última` y `Próxima` en todas las tarjetas.
- Las APIs de cola conservan el correo del solicitante como etiqueta legible de auditoría.
- Los workers registran inicio, resultado para revisión y fallo; la ingesta privada registra su encolado.
- La especificación, arquitectura y conocimiento de Guía explican los disparadores y sus límites.

## Privacidad y aislamiento

Las consultas de historial se filtran por `tenant_id`. La preparación documental sigue siendo manual, usa solo datos autorizados y mantiene revisión humana. No se añaden servicios, transferencias externas ni costes nuevos.

## Verificación

- `npm run check:stability`: correcto, incluidos tipos, workers alojados, aislamiento tenant, evidencia y contratos de revisión humana.
- `npm run check:tenant-plan-ui`: correcto; seis controles renderizados y prueba responsive existente sin regresiones.
- Captura revisada en `.tmp/agent-execution-controls.png`: bloque compacto y legible dentro de cada tarjeta.

## Riesgo residual

La programación editable por tenant y el envío por canales de avisos no forman parte de este cambio; la interfaz solo declara la automatización que ya existe y señala los canales pendientes.
