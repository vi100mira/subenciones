# Puente local multi-tenant — 2026-07-31

## Intención

Evitar que una carpeta local autorizada parezca procesarse desde la web cuando no existe un proceso local capaz de leerla. La selección en el navegador solo genera un preanálisis sin IA; no concede acceso al servidor a los archivos del equipo.

## Cambio aplicado

- `api/ingestion-dispatch.ts` rechaza una ejecución de una fuente `local_simulation` si no hay puente local conectado. No crea una fila `queued` ni accede a archivos.
- `prototype/private-knowledge.js` comunica el paso real: **Conectar el puente local**.
- El guardarraíl de conocimiento privado verifica ambos límites.
- Se añade la migración y la Function que emiten una sesión efímera para enlazar el puente con una fuente local activa.

## Contrato del futuro conector

Cada instalación se autentica con la sesión de la persona y recibe un permiso temporal de 15 minutos para un único `tenant_id` y una única fuente. Solo puede leer la carpeta elegida en modo lectura, debe enviar propuestas y huellas —no una clave de servicio— y todas sus ejecuciones se auditan. La revocación del consentimiento o de la fuente invalida el permiso.

## Estado

La base del puente queda preparada en código: la aplicación emite una sesión temporal y el cliente local `scripts/local-bridge/run-folder-inventory.mjs` analiza una carpeta explícita y entrega inventario y propuestas mediante esa sesión, sin leer `.env` ni usar una `service_role` en el equipo. El API solo persiste inventario, huellas y propuestas permitidas; no recibe archivos ni texto extraído.

No es aún un instalador de escritorio: falta empaquetar este cliente y enlazarlo con el selector de carpeta de la interfaz. Google Drive y SharePoint requerirán sus propios flujos OAuth por entidad y no comparten permisos con una carpeta local. No se han aplicado migraciones, publicado cambios ni procesado carpetas reales.

## Entrega de resultados

Se prepara una segunda sesión, independiente de la lectura, para entregar resultados aprobados en `Insertia/Candidaturas`. Requiere `writeBackOutputs: true` en el consentimiento. El contrato es de creación exclusiva: no permite sobrescribir ni borrar originales. La escritura efectiva y el empaquetado del cliente quedan pendientes; este cambio no activa ninguna entrega.
