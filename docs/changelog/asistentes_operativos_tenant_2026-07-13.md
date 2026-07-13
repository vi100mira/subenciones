# Asistentes operativos por tenant · 2026-07-13

## Intención

Reemplazar estados fijos por configuración real y acciones auditadas del tenant.

## Cambio

- Asistentes carga estados, puertas y motivos desde Supabase.
- Permite consentir y aprobar web pública, ejecutar investigación y revisar sugerencias.
- Permite aprobar el perfil y lanzar el encaje persistido.
- Mantiene revisión humana y muestra un error claro si el backend no está desplegado.

## Verificación

- `npm run check:runtime-truth`
- `npm run typecheck`
- `git diff --check`

## Riesgo residual

- Falta prueba visual autenticada contra las migraciones aplicadas.
