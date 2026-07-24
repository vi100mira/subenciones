# Conocimiento documental privado por tenant

## Intención

Incorporar un flujo explícito para convertir proyectos anteriores de una entidad en hechos maestros reutilizables, sin confundir autorización, conexión, inventario, análisis y aprobación humana. La muestra local de Novaterra se utilizó únicamente para validar el diseño y no se incorporó al repositorio.

## Muestra analizada en local

- 350 archivos distribuidos en cinco proyectos.
- 333 archivos extraíbles directamente: PDF, DOCX y XLSX.
- Se detectaron memorias/proyectos desarrollados, documentos de soporte, anexos administrativos y formularios con poco contenido.
- Hay señales frecuentes de datos personales y categorías sensibles; por ello quedan excluidas por defecto del conocimiento reutilizable.
- El informe técnico transitorio se eliminó después de obtener las conclusiones agregadas, porque el workspace está dentro de OneDrive. No se conserva texto extraído ni valores detectados de correo, teléfono, NIF o IBAN.

## Cambios

- `prototype/private-knowledge.js`: panel de plantilla maestra, autorización de carpeta local/Drive/SharePoint, aprobación separada de la fuente, inventario explícito, revisión de propuestas y formulario guiado alternativo.
- `prototype/opportunity-requirements.js`: una plantilla-esqueleto explica la falta de contenido y conduce al flujo privado.
- `prototype/stitch-theme.css` e `prototype/index.html`: presentación y carga del módulo.
- `api/tenant-agent-governance.ts`: consentimientos privados admitidos, fuentes privadas visibles y aprobación compatible con el permiso concedido.
- `api/source-connections.ts`: valida el consentimiento antes de registrar una fuente, elimina secretos/rutas del registro y audita la solicitud.
- `api/ingestion-dispatch.ts`: impide analizar fuentes privadas si el tenant no tiene contratado el agente Preparación documental.
- `scripts/guardrails/check-private-knowledge-flow.mjs` y `package.json`: contrato automático del flujo y sus límites.

## Verificación

- Extracción local de 333 documentos compatibles sin errores de extracción.
- `node --check` sobre los módulos de interfaz modificados.
- `npm run typecheck`.
- `npm run check:project-docs`.
- `npm run check:tenant-agents`.
- `npm run check:private-knowledge`.
- `npm run check:tenant-plan-ui`, incluyendo tenant con agente y tenant sin agente, escritorio y una columna móvil.
- Revisión visual de `.tmp/private-knowledge-ui.png` y `.tmp/private-source-modal.png` sin credenciales reales.

## Riesgos residuales

- La conexión real a una carpeta local necesita un puente local o selección mediante API de archivos; el backend desplegado no puede leer una ruta del equipo del usuario.
- Google Drive y SharePoint necesitan sus flujos OAuth y selección de carpeta; nunca deben guardar tokens en `config_json`.
- La cola de ingesta ya se registra, pero el worker debe devolver el inventario antes de habilitar propuestas; la UI permanece en “Inventario en curso” hasta entonces.
- Falta persistir hechos maestros con vigencia, evidencia, clase de dato y revisión a nivel de campo, según `docs/product/document-construction-v2.md`.
