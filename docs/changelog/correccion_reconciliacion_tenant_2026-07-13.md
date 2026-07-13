# Corrección de reconciliación tenant · 2026-07-13

## Intención

Corregir el conflicto entre nombres de salida PL/pgSQL y columnas `status` durante la provisión real.

## Cambio

- Añade una migración posterior que reemplaza la función con aliases explícitos.
- Añade una segunda corrección que referencia la clave primaria por nombre en `ON CONFLICT`.
- Mantiene puertas, pausas, permisos y cierre `service_role` sin cambios.
- No modifica las migraciones ya aplicadas.

## Verificación

- `npm run check:tenant-agents`
- `npm run tenant:verify-recovery -- --apply`

## Riesgo residual

- La prueba remota completa debe repetirse después de aplicar esta corrección.
