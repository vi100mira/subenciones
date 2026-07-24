# Recuperación de sesión caducada · 2026-07-23

## Intención

Sustituir el error técnico «Token invalido» por una recuperación segura y comprensible.

## Cambios

- El navegador comprueba `expiresAt` con margen antes de llamar a APIs privadas.
- Una respuesta 401 en Base común cierra la sesión local sin registrar ni enviar documentos.
- El acceso vuelve a mostrarse con una explicación y conserva la pantalla de retorno.
- Tras identificarse otra vez, la persona regresa a Base común; no se omite ninguna comprobación de Supabase o tenant.

## Verificación y límites

- Prueba de navegador de caducidad, nuevo acceso y retorno a Base común.
- No se almacena refresh token ni contraseña y no se modifican permisos del servidor.
