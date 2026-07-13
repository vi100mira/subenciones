# Prueba de ocho folios frente a cuatro máximos · 2026-07-13

## Intención

Convertir el caso comunicado por la CEO de Novaterra en una regresión automática del renderizador real.

## Archivos modificados

- `scripts/guardrails/check-proposal-pdf.mjs`: genera exactamente ocho páginas y exige rechazo frente a un máximo de cuatro.
- `package.json`: incorpora la regresión a la comprobación de estabilidad.

## Verificación

- Ocho páginas frente a cuatro: bloqueado.
- Una página frente a cuatro: aceptada para la siguiente puerta.
- La revisión humana y la prohibición de presentación automática permanecen fuera de esta prueba y siguen siendo obligatorias.
