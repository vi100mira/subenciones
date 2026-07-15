# Registro de entidad en pestaña operativa

Fecha: 2026-07-14

## Intención

- Convertir la pestaña `Registrar entidad` de la entrada pública en el único acceso visible al formulario de alta segura.
- Explicar que la falta de consentimiento para analizar la web pública no bloquea el alta ni inicia ninguna lectura o sugerencia.

## Archivos

- `prototype/public-entry.js`: pestañas accesibles para alternar entre acceso y registro; formulario de alta trasladado a su pestaña.

## Verificación

- Comprobación en navegador local: el acceso aparece inicialmente y la pestaña `Registrar entidad` muestra el formulario y su estado seleccionado.
- `npm run typecheck` y `npm run check:ui` superan correctamente.

## Riesgo residual

- El flujo conserva el endpoint existente de solicitud; la revisión, verificación de email y aprovisionamiento continúan siendo pasos posteriores y explícitos.
