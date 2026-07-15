# Etiqueta de versión de compilación - 2026-07-15

## Intención

Sustituir el texto manual de la versión estable por una etiqueta generada durante la compilación.

## Archivos modificados

- `scripts/generate-build-info.mjs`: genera metadatos públicos desde la versión del paquete y Git.
- `prototype/build-info.js`: artefacto estático generado para la interfaz.
- `prototype/index.html`: muestra la fecha y versión generadas.
- `package.json`: ejecuta la generación como parte de `npm run build`.

## Verificación

- Ejecutar `npm run build` y comprobar que el artefacto refleja la versión de `package.json` y el hash corto de la revisión.

## Riesgo residual

La fecha corresponde al momento de compilación en Europe/Madrid; una release debe seguir actualizando `package.json` y crear su etiqueta Git de forma intencional.
