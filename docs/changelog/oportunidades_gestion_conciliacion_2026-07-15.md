# Gestion de oportunidades y conciliacion tecnica

## Intencion

La pantalla ya no se presenta como `Oportunidades vivas`: contiene estados operativos distintos y debe permitir entender y resolver excepciones sin confundirlas con candidaturas.

## Evidencia previa de solo lectura

- El ultimo encaje de Novaterra contiene 84 recomendaciones.
- 58 coincidian por identificador con el corpus local.
- De las 26 restantes, 24 comparten alguna URL con el corpus, pero esas URLs tambien aparecen en otras convocatorias y no son una identidad segura.
- Solo 1 coincide mediante una URL oficial unica; la conciliacion automatica prudente deja 25 excepciones para revisar.
- La distribucion resultante es 15 en seguimiento, 31 de bajo encaje o descartadas, 13 candidatas fuera de vigencia y 25 incidencias de datos.

## Cambios

- La vista se denomina `Gestion de oportunidades`.
- El runtime intenta primero la clave canonica y despues una URL oficial unica; las 24 coincidencias ambiguas se rechazan para evitar vincular una ayuda equivocada.
- Las excepciones restantes se muestran en `Conciliar datos`, separadas de seguimiento, bajo encaje y fuera de vigencia.
- `Fuera de vigencia` reúne las 13 candidatas que ya no cumplen el criterio actual y cualquier plazo cerrado conservado para trazabilidad; no permite preseleccionar.
- El visor de incidencia permite reintentar la conciliacion, abrir la fuente oficial o descartar una recomendacion obsoleta mediante la decision humana auditada existente.
- Una incidencia no puede preseleccionarse ni tratarse como oportunidad accionable hasta que exista correspondencia.

## Privacidad y control humano

- La conciliacion utiliza identificadores y URLs de fuentes publicas; no mezcla datos privados entre tenants.
- No se modificaron recomendaciones durante el diagnostico.
- El descarte sigue requiriendo motivo, identidad autorizada y registro de auditoria.

## Verificacion

- `node --check` sobre conciliacion, runtime, tabla y aplicacion.
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`.
- `npm run typecheck`.
- Integracion de solo lectura contra el encaje actual: 58 coincidencias por clave, 1 por URL oficial unica y 25 excepciones.
- Frontend, modulo nuevo y API local responden `200`; la carga publica no registra errores de consola.
- Queda pendiente la comprobacion visual autenticada porque la sesion del navegador local esta en la pantalla de acceso.
