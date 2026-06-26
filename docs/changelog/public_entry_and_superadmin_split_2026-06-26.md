# Public entry and superadmin split

Fecha: 2026-06-26

## Cambios

- Se anade una entrada publica previa al cockpit para solicitud de alta y acceso simulado.
- Se separa el rol entidad del rol superadmin en el prototipo.
- El superadmin aterriza en Plataforma para fuentes, campanas RAG y operaciones.
- La entidad demo aterriza en Perfil de entidad para revisar estado, hechos y gobernanza.
- El formulario de alta publica queda oculto dentro del cockpit de entidad.

## Seguridad

- La solicitud publica mantiene el estado `requested`.
- El cockpit deja de ser la puerta natural para alta externa.
- Plataforma y Operaciones quedan ocultas en modo entidad demo.
