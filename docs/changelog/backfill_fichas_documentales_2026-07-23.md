# Recuperación de fichas documentales · 2026-07-23

## Intención

Recuperar los documentos de un inventario privado antiguo que generó hechos reutilizables pero no fichas para revisión y visor.

## Cambios

- Backfill tenant-scoped de metadatos mínimos desde el inventario local, sin copiar contenido.
- Conservación de decisiones humanas previas e identificación de la ejecución original.
- JPG y PNG pasan a ser anexos revisables por nombre y huella, sin OCR ni IA.
- El estado vacío explica de forma veraz cuándo un análisis antiguo carece de fichas.

## Verificación y límites

- Se valida fuente activa, ejecución completada y consentimiento local de solo lectura.
- El backfill no altera los 11 hechos aprobados, no crea embeddings y no almacena rutas locales.
