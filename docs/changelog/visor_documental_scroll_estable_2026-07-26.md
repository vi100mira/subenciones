# Scroll estable en el visor documental · 2026-07-26

## Intención

- Evitar que el sondeo periódico del redactor devuelva al inicio al usuario que está revisando una plantilla o borrador largo.

## Cambio

- `prototype/opportunity-requirements.js` compara la ejecución recibida con la ya mostrada antes de actualizar el `iframe` y las fases de la solicitud.
- Una ejecución idéntica mantiene intacto el documento y su posición; una versión o estado realmente nuevo continúa actualizando el visor.
- No cambia permisos, aislamiento por tenant, contenido privado ni puntos de revisión humana.

## Verificación

- `npm run check:draft-version-ui`: desplaza el documento hasta el final, repite el mismo evento de sondeo y comprueba que `scrollY` no cambia.
- `npm run typecheck`
