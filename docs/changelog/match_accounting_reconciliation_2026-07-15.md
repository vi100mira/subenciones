# Conciliacion de cifras del encaje y del mapa de fuentes

## Problema observado

El Panel mostraba 84 como `Encaje de la entidad`, Oportunidades mostraba 15 vivas y 30 descartadas, y el mapa de fuentes mostraba 28, 11, 18 y 1. Los tres bloques usaban universos diferentes sin explicarlo y daban la apariencia de ser sumables.

## Evidencia comprobada

Consulta de solo lectura sobre Novaterra y comparacion con el corpus local actual:

- 84 recomendaciones persistidas en el ultimo encaje.
- 58 recomendaciones vinculadas con una oportunidad del corpus local.
- 26 recomendaciones pendientes de sincronizar con esta version local.
- De las 58 vinculadas, 28 fueron candidatas/revisables y 30 de bajo encaje.
- De las 28 candidatas/revisables, 15 cumplen el criterio vigente de la vista y 13 quedan fuera de esa vista.
- Las 30 de bajo encaje conservan `decision_status = pending`; no son descartes humanos.

Por tanto, la conciliacion actual es `15 + 30 + 13 + 26 = 84`.

## Cambios

- La tarjeta se denomina `Ultimo calculo de encaje` y explica la ecuacion completa en su detalle desplegable.
- Oportunidades muestra `Bajo encaje` cuando no existe un descarte humano.
- Las categorias activa, fuera de seguimiento y archivada son mutuamente excluyentes.
- El runtime conserva el corpus publico original durante los refrescos y publica los recuentos mapeados/no mapeados.
- El mapa de fuentes avisa que sus cifras son coberturas solapables y no una suma del encaje.
- La ficha BDNS distingue registros vinculados de oportunidades visibles vigentes.

## Privacidad y trazabilidad

- La investigacion fue de solo lectura y limitada al tenant Novaterra.
- No se modificaron recomendaciones, decisiones humanas ni datos de fuentes.
- No se expusieron identificadores, credenciales ni contenido privado en la interfaz.

## Verificacion

- `node --check prototype/match-accounting.js`
- `node --check prototype/app.js`
- `node --check prototype/ui-polish.js`
- `node --check prototype/tenant-recommendations-runtime.js`
- `npm run typecheck`
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`
- Prueba determinista: 15 en seguimiento + 30 fuera + 0 archivadas + 13 fuera de vigencia + 26 sin sincronizar = 84; sin solapamiento ni residuo.
- Navegador: carga correcta del aviso de contadores no sumables. La sesion aislada disponible no estaba autenticada, por lo que la cifra tenant se contrasto contra la persistencia y la prueba determinista.

## Correccion de carga local

- Se cambio la version del recurso `match-accounting.js` para invalidar el `404` que habia quedado almacenado por el navegador tras arrancar Vercel antes de crear el archivo.
- `app.js` conserva una conciliacion local equivalente como defensa: si el auxiliar no llega a cargar, Panel, Cobertura y Oportunidades siguen inicializandose.
- Se reinicio Vercel local heredando `.env.local`; el frontal, el modulo y `api/demo-tenant-status` responden correctamente.
- Verificacion en navegador local: 8 fuentes con contadores y detalle, 46 oportunidades renderizadas y ninguna nueva excepcion de `reconcile` tras la recarga.
