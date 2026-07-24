# Flujo de preparación documental desde Asistentes — 2026-07-17

## Intención

Separar la información comercial de Entidad de la gestión operativa de datos privados. La autorización de IA no debe ocultar el acceso al agente ni enviar al usuario directamente a una candidatura.

## Cambios

- `prototype/tenant-agent-runtime.js`: Preparación documental abre la elección del método; el acceso permanece después de autorizar datos internos.
- `prototype/private-knowledge.js`: ofrece dos vías excluyentes —proyectos autorizados o formulario guiado— y concentra en Asistentes el registro, aprobación e inventario de fuentes.
- `prototype/tenant-plan.js` y `prototype/stitch-theme.css`: Entidad muestra puntos de información compactos y modales; el detalle del curador y redactor pasa al modal de Preparación documental.
- `prototype/help-assistant-knowledge.js` y documentación de producto: describen la nueva entrada y sus límites de privacidad.
- Guardrails de conocimiento privado y plan: comprueban la exclusión entre métodos, la ausencia del panel operativo en Entidad y la persistencia del botón tras autorizar IA.

## Verificación

- Sintaxis JavaScript: superada.
- `npm run typecheck`: superado.
- `npm run check:private-knowledge` y `npm run check:tenant-plan-ui`: superados.
- Prueba visual Playwright en escritorio y móvil: superada; se revisaron los modales de información y elección de método.
- `npm run check:stability`: superado.

## Riesgos residuales

- El inventario sigue siendo asíncrono: el usuario deberá revisar las propuestas cuando el worker termine.
- Drive y SharePoint requieren sus conectores reales antes de abandonar la simulación local; no se ha introducido ningún movimiento externo de datos en este cambio.
