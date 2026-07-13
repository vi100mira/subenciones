# Entidad sin asistentes duplicados · 2026-07-13

## Intención

Reservar la pantalla Entidad para identidad, permisos, fuentes y activación. El catálogo y estado de los agentes permanece en Asistentes como única superficie operativa.

## Archivos tocados

- `prototype/entity-activation.js`: elimina “Servicios contratados”, las tarjetas duplicadas de agentes y la etiqueta comercial “Suite completa contratada”.

## Verificación

- `npm run typecheck`
- `npm run check:ui`
- `npm run check:runtime-truth`
- `npm run check:line-budgets`
- Comprobación visual local: Entidad conserva solo el perfil y Asistentes mantiene su catálogo, estados y leyenda operativa.

## Riesgos residuales

- Ninguno funcional: no cambian permisos, datos, ejecución de agentes ni revisión humana.
