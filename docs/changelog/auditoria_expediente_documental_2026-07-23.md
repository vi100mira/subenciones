# Auditoría de expediente documental · 2026-07-23

## Intención

Definir, sin implementación, el camino desde los esqueletos documentales actuales hasta un paquete de candidatura comparable a expedientes reales.

## Archivos

- `docs/product/expediente-documental-plan.md`: evidencia, taxonomía, brecha, modelo objetivo, fases, controles y aceptación.
- `docs/documentation-index.md`: incorpora el plan al índice canónico.

## Verificación

- Inventario local de 333 PDF/DOCX/XLSX y 524 MB, con cero llamadas externas.
- Comparación de 7 paquetes finales/registrados: 79 entradas y 47 contenidos únicos por SHA-256.
- Inspección estructural de cuatro expedientes: 48 PDF, 879 páginas y 1.238 campos AcroForm.
- Revisión separada de errores funcionales, seguridad, rendimiento y cobertura de pruebas.
- La suite actual pasa, pero se comprobó que no ejecuta los adaptadores privados ni verifica paridad exacta del ZIP.
- Sin cambios en frontend, API, esquema, workers ni datos productivos.

## Riesgos residuales

Las métricas proceden de una muestra de proyectos de un tenant piloto y deben validarse con otro tenant. Las imágenes 2 y 3 recibidas eran idénticas. El plan no convierte ninguna capacidad propuesta en operativa.

## Aclaración posterior

- El motor de memorias se define como capacidad genérica para cualquier organismo; GVA, Alcoy y otros financiadores son fixtures, no ramas de producto.
- Todo campo con evidencia aprobada y uso permitido debe autorrellenarse. Los datos restantes se convierten en propuestas revisables, preguntas concretas o tareas humanas.
