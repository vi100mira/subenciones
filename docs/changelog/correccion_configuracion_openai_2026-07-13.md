# Corrección de configuración local de OpenAI · 2026-07-13

## Intención

Permitir que el instalador local añada la configuración del redactor a `.env.local` sin fallar cuando el archivo ya existe o está vacío.

## Archivos tocados

- `scripts/admin/configure-openai-draft-worker.ps1`: usa una lista mutable explícita y detiene la ejecución ante cualquier error.

## Verificación

- Validación sintáctica del script con el analizador de PowerShell.
- Prueba aislada de adición y actualización sobre un `.env.local` preexistente, sin utilizar credenciales reales.

## Riesgos residuales

- La persona operadora debe volver a ejecutar el instalador: el intento anterior no guardó la clave.
- La validez de la clave y la disponibilidad del modelo se comprobarán en una llamada controlada posterior.
