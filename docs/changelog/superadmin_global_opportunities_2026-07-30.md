# Lectura global y control por excepciones

Fecha: 2026-07-30

- Se añade `GET /api/admin-platform-opportunities`, exclusivo de superadministración. Devuelve oportunidades globales persistidas sin filtrar por fecha, estado, matching o pertenencia tenant.
- Cada registro incluye fuente, procedencia, evidencia y estado. Las candidatas privadas se devuelven como fuentes candidatas, diferenciando verificada/no publicable y tracked/pendiente de revisión; nunca como recomendación de cliente.
- La UI de superadministración usa esta lectura y expone estados abiertos, rolling, cerrados, archivados, pendientes de evidencia/revisión y privados en el filtro de Estado.
- Auditoría y Monitorización usan lecturas persistidas existentes (`tenant-audit-events` para entidad y `admin-platform-overview` para plataforma); fuera de modo fixture muestran carga, datos reales o vacío explicativo.
- La bandeja de bases se limita a excepciones de evidencia. El sistema conserva extracción y validaciones objetivas; el especialista tenant debe revisar aplicabilidad y matching. No se activa publicación, matching, rastreo, alertas ni escritura remota.

Riesgo residual: las interpretaciones con citas completas siguen en `review_required` hasta que exista una transición automática persistida y auditada; este cambio no la ejecuta ni modifica registros existentes.
