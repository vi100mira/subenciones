# Configuracion del acceso en Vercel — 2026-07-12

## Intencion

Restaurar el acceso institucional en produccion. La funcion `api/auth-session.ts` rechazaba cualquier login porque el proyecto de Vercel no tenia variables de entorno configuradas.

## Cambios

- Se configuran en el ambito `production` de Vercel la URL de Supabase, la clave publica de autenticacion, el service role exclusivo de servidor y los correos administradores ya presentes en `.env.local`.
- No se modifican migraciones, datos de tenant, codigo de autenticacion ni politicas RLS.
- Los valores secretos permanecen fuera de Git y del frontend.

## Verificacion

- `vercel env ls` antes del cambio: ninguna variable configurada.
- TypeScript y guardrails locales ejecutados tras el cambio.
- API de autenticacion y pantalla de acceso comprobadas contra el despliegue de produccion.

## Riesgos residuales

- Las credenciales visibles en capturas compartidas deben rotarse por su propietario; esta configuracion no sustituye esa rotacion.
