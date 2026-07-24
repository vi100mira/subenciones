# Propuesta de construcción documental v2

## Intención

Estudiar por qué las plantillas visibles permanecen como esqueletos y definir una evolución que rellene datos y narrativa de forma consistente, trazable y tenant-scoped.

## Archivos tocados

- `docs/product/document-construction-v2.md`: diagnóstico, modelo de hechos, matriz de campos, pipeline, experiencia de revisión, información necesaria y primer slice.
- `docs/documentation-index.md`: incorpora la propuesta al índice de lectura y actualiza su fecha.

## Verificación

- La propuesta se contrastó con el redactor, su contrato de salida, la preparación de contexto, el catálogo actual de sugerencias, el RAG tenant, la exportación privada y las puertas de revisión humana.
- `npm run check:project-docs`: correcto.
- El documento queda en 223 líneas, dentro del límite recomendado para una especificación focalizada.

## Riesgos residuales

- Es una propuesta de producto y arquitectura; todavía no modifica el comportamiento del prototipo.
- El porcentaje real de autorrellenado solo podrá medirse con un modelo oficial y un conjunto mínimo de hechos aprobados de la entidad piloto.
