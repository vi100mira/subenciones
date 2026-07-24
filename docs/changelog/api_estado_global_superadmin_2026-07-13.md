# Estado global real para superadmin

Fecha: 2026-07-13

## Intención

Crear una fuente administrativa única para sustituir datos de ejemplo en Asistentes, Auditoría, Operaciones, Revisiones y Panel.

## Cambios

- Nueva API `GET /api/admin-platform-overview`, protegida por la identidad superadmin configurada.
- Agrega entidades, estado de tenants, catálogo y activación de agentes, ejecuciones, eventos de auditoría, fuentes y campañas públicas.
- Incluye recuentos reales de oportunidades, revisiones públicas pendientes y alertas tenant abiertas.
- No devuelve documentos, hechos internos, borradores ni el detalle JSON de los eventos tenant.

## Archivos

- `api/admin-platform-overview.ts`

## Verificación

- TypeScript correcto.
- Una petición sin sesión devuelve `401`.
- La prueba superadmin autenticada obtiene la fotografía global y renderiza las cinco vistas.

## Riesgo residual

- La respuesta limita los listados recientes a 200 ejecuciones tenant, 300 eventos y 100 campañas; será necesario paginar cuando crezca la plataforma.
