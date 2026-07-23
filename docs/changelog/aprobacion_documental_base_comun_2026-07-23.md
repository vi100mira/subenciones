# Aprobación documental de la Base común · 2026-07-23

## Intención

Convertir el inventario local de una carpeta en propuestas documentales visibles y revisables antes de incorporarlas a la Base común.

## Cambios

- El puente persiste únicamente nombre, huella, tipo, clasificación y recomendación; no copia rutas ni contenido.
- Nuevo endpoint tenant-scoped para listar y revisar propuestas.
- Base común muestra la explicación del algoritmo y permite aprobar o descartar cada documento.
- Toda decisión queda auditada y es independiente de la aprobación posterior de hechos extraídos.

## Verificación y riesgos residuales

- Contratos de aislamiento, inventario local, TypeScript y flujo UI autenticado.
- Los fragmentos continúan en cuarentena local; todavía no existe previsualización del contenido original desde la web.
