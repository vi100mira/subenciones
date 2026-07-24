# Conexión del panel con el tenant

Fecha: 2026-07-24

## Intención

Evitar que una sesión caducada conserve la apariencia de estar conectada a Novaterra y sustituir el contador simulado de documentos por el inventario privado real del tenant.

## Cambios

- Las cargas de encaje y asistentes invalidan la sesión al recibir `401`; la aplicación vuelve al acceso con el aviso seguro existente.
- Auditoría aplica la misma recuperación y deja de continuar con una sesión caducada.
- Una membresía inexistente para el `tenant_id` de la sesión se clasifica como `401`; los errores reales al consultar Supabase permanecen diferenciados y no se enmascaran.
- Las sesiones antiguas cuyo `tenantId` no es un UUID se invalidan antes de lanzar llamadas privadas; el servidor aplica la misma validación antes de consultar membresías.
- Base común comprueba que existe sesión y token antes de consultar Gobernanza o Perfil, evitando dos peticiones residuales tras invalidar el acceso.
- `tenant-agent-governance` cuenta exclusivamente documentos de fuentes `tenant_private` del tenant autenticado.
- El panel consume ese resumen y muestra el inventario real en “Documentos de la entidad”.
- Los runtimes de panel, auditoría, asistentes y encaje cambian su identificador de caché para que el navegador no conserve la versión anterior.
- Las fuentes públicas del tenant quedan fuera de ese contador, por lo que Novaterra muestra los 346 documentos de “Proyectos presentados”, no los 358 registros totales que también incluyen BDNS y su web pública.

## Privacidad y aislamiento

- El recuento se filtra simultáneamente por `tenant_id` y por los identificadores de fuentes privadas obtenidos para ese mismo tenant.
- No se expone contenido, nombre de archivo ni fragmentos; solo el total agregado.
- No se modifica ninguna membresía, documento, consentimiento ni recomendación.

## Verificación

- Consulta de solo lectura: tenant activo, 2 miembros, 6 agentes habilitados, 89 recomendaciones y 346 documentos privados.
- `npm run check:tenant-agents`
- `npm run check:tenant-match`
- `npm run check:tenant-plan-ui`
- `npm run typecheck`

## Riesgo residual

- La sesión no guarda refresh token por diseño; al caducar requiere que la persona vuelva a identificarse.
# Corrección adicional: entorno local de las Functions

- La autenticación podía completarse, pero cada Function protegida se ejecutaba en un proceso local separado sin las variables de `.env.local`.
- `src/supabaseAdmin.ts` carga ahora ese archivo únicamente en servidor y solo completa variables ausentes; los valores configurados por Vercel conservan prioridad.
- Esto evita que auditoría, gobierno de agentes, perfil y encaje fallen simultáneamente con `400` después de un acceso válido.
- No se envían claves al frontend ni se modifica el aislamiento por tenant.
