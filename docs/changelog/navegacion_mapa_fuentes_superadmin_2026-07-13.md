# Navegación del mapa de fuentes superadmin — 2026-07-13

## Intención

Sustituir la acción ambigua “Gestionar” del mapa global por un acceso productivo al estado operativo real de las fuentes.

## Archivos

- `prototype/app.js`: adapta la acción por rol y, para superadmin, abre Operaciones y enfoca la salud de fuentes.
- `prototype/index.html`: identifica el bloque de salud como destino accesible.
- `scripts/guardrails/check-platform-superadmin-ui.mjs`: verifica etiqueta, ruta y foco del destino.

## Verificación

- Navegación `Panel de plataforma → Ver estado de fuentes → Operaciones`.
- Foco situado en el bloque de salud de fuentes.
- Comportamiento tenant preservado como “Gestionar”.

## Riesgo residual

La vista permite observar y revisar el estado; no habilita edición directa de conectores hasta disponer de permisos y auditoría específicos.
