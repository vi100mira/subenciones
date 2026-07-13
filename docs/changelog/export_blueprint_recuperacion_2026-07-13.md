# Blueprint de recuperación tenant · 2026-07-13

## Intención

Permitir reconstruir la estructura después de un borrado definitivo sin restaurar datos que debían desaparecer.

## Cambio

- Superadmin puede exportar nombre, slug, aspecto, web pública, owner técnico y perfil aprobado.
- Devuelve SHA-256 del blueprint y audita la exportación.
- Excluye consentimientos, documentos privados y secretos de forma explícita.
- El mismo endpoint POST provisiona nuevamente el blueprint v1.

## Verificación

- `npm run check:tenant-agents`
- `npm run typecheck`
- `git diff --check`

## Riesgo residual

- El archivo exportado debe almacenarlo el usuario en un lugar seguro; no se persiste fuera del tenant automáticamente.
