# Aclaraciones de acceso y consentimiento — 2026-07-13

## Intención

Reducir texto técnico inicial en el acceso público y explicar los controles sensibles solo cuando la persona lo solicita mediante un icono de información.

## Archivos modificados

- `prototype/public-entry.js`: sustituye los avisos iniciales de acceso y alta por dos puntos de información; conserva los avisos para errores o resultados reales de los formularios.
- `prototype/public-entry.css`: incorpora el tooltip accesible por cursor y teclado.
- El mensaje de control sustituye «consentimiento granular» por una explicación concreta sobre permiso explícito y registro de cada uso de datos privados.

## Verificación

- Comprobación de interfaz y revisión de los tooltips en escritorio y móvil.

## Riesgo residual

- Los tooltips dependen de hover o foco; la información no bloquea el uso de los formularios.
