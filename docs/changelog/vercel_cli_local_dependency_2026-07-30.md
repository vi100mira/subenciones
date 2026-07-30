# CLI de Vercel versionada para desarrollo local — 30 de julio de 2026

## Intención

Hacer reproducible el uso de la CLI de Vercel desde las dependencias de desarrollo del proyecto, sin instalación global requerida.

## Cambios

- `package.json` y `package-lock.json` añaden `vercel@^58.4.0` como dependencia de desarrollo.
- La versión local responde a `./node_modules/.bin/vercel.cmd --version`.

## Límite operativo

- No se realizó ningún despliegue ni autenticación.
- Vercel Dev puede intentar vincular una copia no enlazada cuando se le pasa `--yes`; no debe usarse ese indicador para copias temporales si no hay autorización explícita para crear o vincular proyectos.
