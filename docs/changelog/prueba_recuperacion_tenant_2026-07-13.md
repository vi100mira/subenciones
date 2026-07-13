# Prueba de recuperación tenant · 2026-07-13

## Intención

Demostrar con un tenant desechable que la estructura puede eliminarse y reconstruirse sin tocar Novaterra.

## Cambio

- Añade ensayo seco por defecto.
- Con `--apply`, limita el slug a `recovery-fixture-*`.
- Verifica seis agentes, archivo, restauración, borrado y recreación del mismo slug.
- Comprueba que los consentimientos no reaparecen automáticamente tras borrar.
- Declara transporte WebSocket compatible con el Node 20 del proyecto.

## Verificación

- `npm run tenant:verify-recovery`
- `npm run check:tenant-agents`

## Riesgo residual

- La ejecución remota con `--apply` requiere migraciones publicadas y autorización explícita.
