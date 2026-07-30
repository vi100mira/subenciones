# Bootstrap de esquema vacío — 2026-07-30

Se añadió un manifiesto ordenado, un emisor SQL transaccional, una consulta de
verificación y un guardarraíl local para inicializar el esquema completo de
Supabase en un proyecto cuyo `public` está comprobado vacío. Se excluyen el seed
y la actualización comercial de demo Novaterra y no se inicia ninguna campaña, alerta, rastreo, worker o
despliegue. El catálogo técnico global de agentes se conserva como metadato sin
ejecuciones ni tenants.

La definición programada de Vercel para el radar se retiró temporalmente de
`vercel.json`. El endpoint permanece disponible para una activación futura
autorizada, pero un despliegue de este commit no programa invocaciones diarias.

Verificación prevista: `npm run supabase:check-empty-bootstrap` y revisión del
SQL emitido. Riesgo residual: el emisor no registra historial de migraciones;
la vía administrativa aprobada debe ejecutar el bootstrap y reconciliar la
historia sin tocar tablas internas a ciegas.
