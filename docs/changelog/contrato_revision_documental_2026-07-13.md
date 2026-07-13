# Contrato de revisión documental · 2026-07-13

## Intención

Convertir Revisión documental en una capacidad tenant verificable, no en una etiqueta de interfaz.

## Cambio

- Extrae elegibilidad, criterios, documentos, canal y plazo desde la versión oficial estructurada.
- Conserva versión, hash, URL y fragmento para cada requisito.
- Persiste por tenant con RLS y revisión humana obligatoria.
- No usa IA externa ni datos privados para esta primera revisión.

## Verificación

- `npm run check:document-review`
- `npm run typecheck`

## Riesgo residual

- La extracción depende de los campos estructurados por el radar y debe declarar vacíos o baja confianza.
