# Resolución del inventario documental local

## Intención

Resolver las ejecuciones privadas que quedaban en cola tras seleccionar una carpeta local y aclarar el flujo posterior. La selección y confirmación de la carpeta solicitan una única ejecución; al terminar se revisan propuestas y solo una acción voluntaria distinta vuelve a analizar la fuente.

## Resultado del piloto Novaterra

- 333 documentos compatibles inventariados de forma local.
- 26 candidatos de plantilla detectados.
- 11 propuestas internas creadas para revisión humana.
- 9 documentos bloqueados por posible contenido sensible.
- 65 párrafos con posibles datos personales excluidos.
- 0 llamadas a IA externa y coste de IA de 0 €.
- Documentos y rutas originales no almacenados en Supabase; solo propuestas minimizadas, huellas y métricas agregadas.

## Archivos principales

- `scripts/workers/run-local-private-inventory.mjs`: puente local acotado a tenant, fuente y consentimiento.
- `prototype/private-knowledge.js` y `prototype/private-analysis-state.js`: revisión directa tras completar y actualización voluntaria separada.
- `api/tenant-profile-review.ts` y `prototype/master-fact-review.js`: revisión privada sin mezclar la aprobación del perfil público.
- `prototype/audit-runtime.js` y `prototype/help-assistant-knowledge.js`: trazabilidad y explicación para Guía.
- Documentación de producto y guardrails asociados.

## Verificación

- `npm run check:stability` completado correctamente, incluida la comprobación de tipos TypeScript.
- Contrato estático del puente local: aislamiento, consentimiento, preflight, cero IA, auditoría y limpieza temporal.
- Prueba de estados del análisis privado y prueba de interfaz de Preparación documental.
- Estado persistido comprobado: ejecución finalizada, tres colas antiguas canceladas y 11 propuestas privadas pendientes de revisión.

## Riesgo residual

El puente local es una utilidad controlada por el operador para el piloto y requiere que el proceso esté activo en el equipo que contiene la carpeta. No sustituye conectores de producción para Drive o SharePoint, que necesitarán credenciales delegadas y alcance limitado por tenant.
