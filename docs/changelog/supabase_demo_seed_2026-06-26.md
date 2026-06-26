# Supabase demo seed

Fecha: 2026-06-26

## Cambios

- Se anade una migracion idempotente para crear el tenant demo `novaterra-demo` sin datos personales.
- Se crean fuentes demo de BDNS publica y entrevista guiada pendiente de aprobacion.
- Se anade un endpoint server-side `api/demo-tenant-status.ts` para verificar lectura real desde Supabase sin exponer datos sensibles.

## Verificacion prevista

- Ejecutar `npx supabase db push --linked` para aplicar solo la nueva migracion.
- Validar la lectura con service role local sin imprimir secretos.
- Ejecutar `npm run check:stability`.
