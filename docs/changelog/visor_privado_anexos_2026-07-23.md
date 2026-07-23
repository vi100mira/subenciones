# Visor privado de anexos · 2026-07-23

## Intención

Permitir comprobar el documento original desde la Base común antes de aprobarlo y volver a verlo después de almacenarlo.

## Cambios

- Vista previa local de PDF, JPG y PNG sin subir el archivo; compara su SHA-256 con el inventario.
- Vista privada autenticada y tenant-scoped para originales guardados en Blob.
- Confirmación explícita para documentos personales o sensibles, marca visual de usuario y fecha, sin caché.
- Auditoría separada `private_annex.previewed`; el contenido no se copia al evento ni se envía a IA o embeddings.
- DOCX y XLSX continúan disponibles mediante descarga privada hasta incorporar una conversión segura.

## Verificación y límites

- Pruebas locales con archivos simulados, typecheck y guardrails; sin carga real, despliegue ni migración.
- La marca de agua es una capa de interfaz, no altera el archivo original descargable.
