# Selector de carpeta integrado — 2026-07-18

## Intención

Evitar que la selección habitual de proyectos locales muestre el aviso genérico de carga masiva del navegador y presentar el control con el lenguaje visual de Insertia.

## Cambios

- En navegadores compatibles se usa el acceso de solo lectura a carpetas (`showDirectoryPicker`).
- Insertia recorre localmente los metadatos necesarios para la criba sin leer el contenido ni guardar la ruta.
- El selector `webkitdirectory` se ofrece explícitamente para OneDrive, SharePoint sincronizado y carpetas con puntos de sincronización que Chromium puede bloquear como archivos del sistema.
- La selección, el resumen y los errores se muestran dentro del modal de Insertia.

## Privacidad y riesgo residual

No se añade movimiento de datos ni consumo de IA. El selector de carpeta o cualquier permiso de seguridad del sistema operativo/navegador seguirá siendo nativo y no puede estilizarse desde la aplicación.

## Verificación

- Comprobación sintáctica del JavaScript: superada.
- Prueba UI del botón integrado y de la alternativa compatible: superada.
- `npm run check:private-source-preflight`, `npm run check:private-knowledge`, `npm run check:tenant-plan-ui` y `npm run check:stability`: superados.
