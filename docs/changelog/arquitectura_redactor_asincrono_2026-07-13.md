# Arquitectura del redactor asíncrono · 2026-07-13

## Intención

Reflejar en español el contrato y el estado real del agente redactor después de activar su cola y worker.

## Archivos modificados

- `docs/product/agentic-architecture.md`: traducción completa y ciclo actual del redactor.
- `docs/architecture/arquitectura-actual-del-sistema.md`: diagrama, cola, consumidor, estado y ficheros ejecutables.

## Verificación

- Tarea Windows cada cinco minutos, `StartWhenAvailable`, `IgnoreNew` y último resultado 0.
- Ejecución Majadahonda en `awaiting_provider`, cinco páginas, Arial 12, sin texto privado persistido.

## Riesgo residual

- La generación IA no está activa hasta decidir proveedor, modelo, tratamiento de datos y presupuesto.
