# Interfaz de la cola del redactor · 2026-07-13

## Intención

Conectar la candidatura con la cola real del redactor y mostrar estados sin prometer una salida inexistente.

## Archivos modificados

- `prototype/opportunity-requirements.js`: botón de solicitud y espacios de estado dentro del proyecto y borrador.
- `prototype/draft-agent-ui.js`: encolado autenticado, consulta tenant-scoped y estados en español.
- `prototype/index.html`: carga versionada del módulo.

## Privacidad y revisión

- La primera solicitud usa solo evidencia pública.
- No envía hechos internos ni permite presentación automática.
- `awaiting_provider` se muestra como espera real, no como borrador terminado.

## Verificación prevista

- Sintaxis, estabilidad y navegador móvil/escritorio.
- Sin sesión debe pedir autenticación; con sesión debe reflejar el estado persistido.

## Riesgo residual

- No hay generación hasta autorizar proveedor y modelo.
