# Activacion segura de invitaciones

La portada reconoce enlaces de invitacion o recuperacion de Supabase y permite establecer una contrasena una sola vez, sin guardar tokens ni contrasenas en el navegador.

Tras activarla, el acceso se valida por el mismo endpoint de sesion y la autorizacion de superadministracion sigue dependiendo de la allowlist de produccion.

El flujo admite los tres retornos de Supabase: sesion en fragmento, codigo PKCE o token hash. No requiere que la persona comparta su enlace de acceso.
