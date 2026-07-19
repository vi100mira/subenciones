# Flujo estable entre lista y expediente de candidatura

## Intencion

Evitar que un expediente conservado en la sesion aparezca durante la carga y desaparezca al recuperar las decisiones de encaje. La entrada a `Candidatura` debe mostrar siempre la lista; el expediente de trabajo solo se abre tras una accion explicita.

## Archivos tocados

- `prototype/opportunity-requirements.js`: el expediente deja de restaurarse por defecto, se abre de forma explicita y vuelve a la lista con una unica funcion de estado.
- `prototype/workspace-flow.js`: la lista queda identificada como vista propia, `Ver detalle` pasa a `Ver tareas` y se explica donde se trabaja la documentacion.
- `prototype/stitch-theme.css`: lista y expediente son estados visualmente excluyentes.
- `prototype/index.html`: renovacion de versiones de los recursos modificados.
- `scripts/guardrails/check-tenant-match-contract.mjs`: contrato contra restauraciones implicitas y vistas simultaneas.

## Verificacion

- Navegador: un expediente antiguo en `sessionStorage` no aparece al entrar; `Ver tareas` abre el resumen de tareas; `Preparar Word` abre solo el expediente en la pestaña Borrador; tanto `Volver a candidaturas` como el menu restauran solo la lista.
- `npm run check:tenant-match` y `npm run typecheck`: correctos.
- `npm run check:stability`: correcto (tipado, presupuestos de lineas, contratos tenant, documentos y evidencia).

## Riesgo residual

El prototipo conserva en almacenamiento local la candidatura seleccionada y en almacenamiento de sesion el paquete documental. Se mantiene esa persistencia de datos de demostracion, pero ya no controla por si sola que el expediente sea visible.
