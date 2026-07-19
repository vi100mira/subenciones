# Selector de carpeta local antes del inventario — 2026-07-17

## Intención

Impedir que una fuente local se encole sin que la persona haya seleccionado antes la carpeta concreta que autoriza en su dispositivo.

## Cambios

- `prototype/private-knowledge.js`: incorpora un selector de directorio para crear una fuente local y vuelve a solicitarlo cuando una fuente registrada no tiene una selección viva en la sesión.
- La interfaz muestra nombre de carpeta, número total de archivos y cantidad compatible (`PDF`, `DOCX`, `XLSX`).
- La cola queda bloqueada hasta completar el selector. Cambiar a Drive o SharePoint oculta y desactiva el control local.
- `prototype/stitch-theme.css`: añade el resumen visual de la carpeta seleccionada.
- La Guía y la especificación funcional explican el paso y sus límites.
- Los guardrails verifican que no se llama a `ingestion-dispatch` antes de mostrar el selector.

## Privacidad

- Los objetos `File` solo permanecen en la memoria de la pestaña durante la selección.
- La ruta absoluta no está disponible para la aplicación web, no se guarda y no se envía a Supabase.
- Solo se conserva temporalmente nombre raíz y recuentos; al recargar debe seleccionarse de nuevo.
- No se ha accedido a la carpeta del piloto durante este cambio.

## Verificación

- Sintaxis JavaScript y `npm run typecheck`: superados.
- `npm run check:private-knowledge`: superado.
- `npm run check:tenant-plan-ui`: superado; confirma cero solicitudes de inventario antes del selector.
- Aplicación local recargada sin errores de consola.

## Riesgo residual

El selector resuelve la autorización explícita y evita la cola falsa, pero el procesamiento completo de los archivos locales continúa necesitando un procesador o puente local. Este cambio no introduce ese servicio ni sube los documentos al backend.
