# Codificación de logs de radares · 2026-07-13

## Intención

Conservar en UTF-8 los mensajes y nombres españoles emitidos por los workers cuando se ejecutan desde el Programador de tareas de Windows.

## Archivo modificado

- `scripts/workers/run-municipal-radar-scheduled.ps1`: fija UTF-8 para la salida de consola, el pipeline de PowerShell y Python.

## Verificación prevista

- Disparar la tarea programada real.
- Confirmar resultado 0 y mensajes legibles de los tres consumidores.

## Riesgo residual

- Las líneas históricas ya recodificadas no se reescriben; las nuevas ejecuciones quedan correctas.
