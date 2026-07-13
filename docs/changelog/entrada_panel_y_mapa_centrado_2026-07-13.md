# Entrada al panel y mapa centrado — 2026-07-13

## Intención

Hacer que el acceso autenticado aterrice siempre en el panel y mejorar la lectura del mapa de fuentes con todos sus textos centrados.

## Archivos

- `prototype/public-entry.js`: usa `dashboard` como destino predeterminado tras el acceso o al recuperar una sesión sin ruta explícita.
- `prototype/styles.css`: centra nombre y estado dentro de cada fuente, también cuando ocupan varias líneas.
- `scripts/guardrails/check-onboarding-ui.mjs`: actualiza las expectativas de entrada para entidad y superadmin.

## Verificación

- Acceso autenticado de ambos roles al panel.
- Rutas explícitas conservadas.
- Revisión responsive del mapa y del panel superadmin.

## Riesgo residual

Ninguno funcional conocido; el cambio solo modifica el destino por defecto y la alineación visual.
