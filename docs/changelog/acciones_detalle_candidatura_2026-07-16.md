# Acciones del detalle de candidatura

## Intencion

Conectar los botones del modal `Ver detalle` con las areas reales del expediente, evitando controles decorativos sin respuesta.

## Comportamiento

- `Ver evidencia` abre Analisis.
- `Verificar` abre Checklist.
- `Preparar Word` abre Borrador.
- `Anexar` abre Documentos.

El modal se cierra al navegar y ninguna accion modifica por si sola el estado de revision.

## Archivos tocados

- `prototype/workspace-flow.js`: asigna y gestiona destinos de las acciones.
- `prototype/opportunity-requirements.js`: permite abrir el expediente en una pestaña concreta.
- `prototype/index.html`: renueva las versiones de ambos recursos.
- `scripts/guardrails/check-tenant-match-contract.mjs`: protege el contrato interactivo.

## Verificacion

- `node --check` sobre ambos runtimes: correcto.
- `node scripts/guardrails/check-tenant-match-contract.mjs`: correcto.
- Prueba interactiva aislada con JavaScript y estilos reales: Analisis, Checklist, Borrador y Documentos se abren desde sus botones; el modal se cierra y no cambia estados.
- `npm run check:stability`: correcto.
