# Guardrail para fuentes privadas insustanciales — 2026-07-18

## Intención

Evitar que una carpeta local, una carpeta de Google Drive o una biblioteca de SharePoint elegida por error consuma recursos, llegue a la cola o active análisis posteriores sin contenido documental suficiente.

## Contrato

- `blocked`: fuente vacía, sin `PDF`/`DOCX`/`XLSX` o con menos de 4 KB compatibles; no puede encolarse.
- `review`: menos de 3 documentos compatibles o menos de 100 KB; requiere confirmación humana.
- `ready_limited`: la persona acepta expresamente probar una fuente pequeña.
- `ready`: supera la criba mínima.

El preanálisis declara siempre `aiCalls: 0`.

## Cambios

- `src/privateSourcePreflight.ts`: política común y validación de manifiestos agregados.
- `api/private-source-preflight.ts`: persiste y audita el resultado por tenant sin recibir rutas, nombres ni contenido.
- `api/ingestion-dispatch.ts`: rechaza fuentes privadas que no tengan preflight `ready` o `ready_limited`.
- `api/tenant-agent-governance.ts`: tampoco permite aprobar una fuente privada antes de superar la criba.
- `prototype/private-source-preflight.js`: evaluación inmediata del selector local sin leer contenido.
- `prototype/private-knowledge.js`: muestra bloqueo o advertencia y exige confirmación para fuentes pequeñas.
- `api/tenant-agent-governance.ts`: devuelve el estado de preflight necesario para explicar la decisión.
- La Guía y la documentación de arquitectura describen el mismo flujo para las tres modalidades.

## Privacidad y coste

- No se llama a IA durante esta criba.
- Solo se guardan archivos totales, archivos compatibles, bytes compatibles, estado y fecha.
- No se guardan rutas, nombres de archivos, texto ni credenciales.
- La aceptación limitada se registra en auditoría y no elimina la revisión humana posterior.

## Verificación

- Política ejecutada contra fuentes vacías, incompatibles, limitadas, aceptadas y suficientes.
- Prueba UI con una carpeta que solo contiene `nota.txt`: queda bloqueada y produce cero llamadas a `ingestion-dispatch`.
- `npm run typecheck`, `npm run check:private-source-preflight`, `npm run check:private-knowledge` y `npm run check:tenant-plan-ui`: superados.

## Riesgo residual

Drive y SharePoint todavía necesitan sus adaptadores OAuth y de listado reales; cuando se conecten deberán invocar el mismo endpoint de preflight. Hasta entonces no pueden obtener un estado válido y el backend impide encolarlos.
