# INSERTIA 0.2.0 estable

Fecha: 2026-07-13

## Alcance

- Identidad INSERTIA y favicon consolidados.
- Acceso público aclarado y alta con selector territorial.
- Normalización de fuentes simplificada y responsive.
- Panel, Asistentes, Auditoría, Revisiones y Operaciones superadmin conectados a estado persistido multi-tenant.
- Revisiones operativas limitadas a las tres rutas que disponen de worker alojado.

## Verificación

- Batería `check:stability` completa.
- Prueba autenticada `check:platform-superadmin` contra Supabase y API local.
- Comprobación responsive de las cinco vistas superadmin a 390 px.
- Preflight de GitHub, Vercel, Supabase y secretos antes de publicación.

## Publicación

- Versión del paquete: `0.2.0`.
- Interfaz identificada como `Versión estable`.
- Etiqueta Git prevista: `v0.2.0-stable.20260713`.
