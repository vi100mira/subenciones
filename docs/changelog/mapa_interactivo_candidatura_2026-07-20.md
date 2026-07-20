# Mapa interactivo y navegación contextual de candidatura — 2026-07-20

## Intención

Mantener el expediente activo durante todo el recorrido y distinguir visualmente la información de la convocatoria de las áreas donde el operador debe actuar.

## Cambios

- `prototype/opportunity-requirements.js`: sustituye la fila mixta de pestañas por un mapa con dos carriles, `Entender` y `Preparar`.
- Cada nodo de `Entender` abre su explicación en un modal y cada nodo de `Preparar` abre su propio formulario operativo, sin mezclar contenido debajo del mapa.
- `Preparar Word` conserva el expediente y abre directamente `Borrador Word`.
- `Volver al plan` y regresar a `Candidatura` desde el menú recuperan el modal de la candidatura activa.
- `prototype/stitch-theme.css` y los guardrails diferencian ambos recorridos, comprueban el retorno contextual y validan los modales informativo y operativo en móvil.

## Privacidad y control

El cambio es exclusivamente de navegación y presentación. No modifica fuentes, datos privados, permisos, estados de revisión ni envíos externos. La generación documental sigue versionada y sujeta a revisión humana.

## Verificación

- `npm run typecheck`.
- `npm run check:tenant-match`.
- `npm run check:tenant-plan-ui`: abre `Fechas` y `Borrador Word` en sus modales a 390 px.
- `npm run check:draft-version-ui`: conserva versiones y abre `Ver qué falta` en el modal `Documentos`.
- Interfaz y API local verificadas con HTTP 200 en el puerto 4190.
- `npm run check:line-budgets` y `git diff --check`.

## Riesgo residual

El mapa conserva los paneles existentes; futuras acciones nuevas deberán clasificarse explícitamente como información o preparación para no volver a mezclar ambos conceptos.
