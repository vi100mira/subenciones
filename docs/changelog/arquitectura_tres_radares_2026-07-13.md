# Arquitectura de tres radares · 2026-07-13

## Intención

Actualizar el documento canónico para representar el estado productivo después de cerrar los ciclos municipal, social general y privado.

## Archivo modificado

- `docs/architecture/arquitectura-actual-del-sistema.md`: diagrama, colas, workers, evidencia, límites de redacción, cifras y riesgos actuales.

## Verificación

- Campaña general real: 3 examinadas, 0 activadas, 3 rechazadas, estado `completed`.
- Campaña privada real: 15 examinadas, 0 activadas, 15 en seguimiento o revisión, estado `completed`.
- Un cambio de plazo privado quedó como crítico y pendiente de revisión humana; no se generó alerta porque ningún tenant seguía esa oportunidad.

## Riesgos residuales

- Los workers dependen del equipo Windows programado.
- El radar general aún necesita cursor incremental para cubrir exhaustivamente todas las páginas.
- No hay runtime LLM productivo ni envío externo automático.
