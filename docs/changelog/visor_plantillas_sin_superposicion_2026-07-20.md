# Visor de plantillas sin superposición — 2026-07-20

## Intención

Dar prioridad visual al documento y evitar que `Ver plantilla` apile un segundo modal sobre `Documentos`.

## Cambios

- `prototype/opportunity-requirements.js`: sustituye el modal `Documentos` por un visor único y añade retorno contextual a `Documentos`.
- `prototype/stitch-theme.css`: organiza documento y controles en un espacio de trabajo amplio, sin scroll exterior duplicado y con adaptación móvil.
- `scripts/guardrails/check-draft-version-ui.mjs`: comprueba una sola capa modal, retorno, vista móvil y conservación del flujo versionado.

## Privacidad y control

No cambia datos, permisos ni generación. Las plantillas siguen siendo borradores y mantienen revisión humana obligatoria antes de exportar, usar o presentar.

## Verificación

- `npm run check:draft-version-ui`.
- `npm run check:tenant-plan-ui` y `npm run check:stability`.
- Interfaz y API local verificadas con HTTP 200 en el puerto 4190.
- `npm run typecheck`, `npm run check:line-budgets` y `git diff --check`.
