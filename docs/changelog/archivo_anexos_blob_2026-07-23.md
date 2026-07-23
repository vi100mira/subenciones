# Archivo de anexos en Blob privado · 2026-07-23

## Intención

Guardar documentos completos reutilizables —incluidos anexos personales restringidos— después de una aprobación documental explícita.

## Cambios

- Carga binaria de hasta 4 MB con verificación SHA-256 contra el inventario.
- Ruta Blob privada, opaca y tenant-scoped; nunca se conserva una URL pública.
- Descarga autenticada y auditada con `Cache-Control: private, no-store`.
- DNI, firmas y otros anexos personales se aprueban como restringidos, sin IA ni embeddings.
- La Base común permite guardar y recuperar el original después de aprobarlo.

## Verificación y límites

- Preflight local de Git, Vercel, Supabase y secretos; sin despliegue ni migración remota.
- Los archivos mayores de 4 MB necesitarán subida directa o multipart en una fase posterior.
