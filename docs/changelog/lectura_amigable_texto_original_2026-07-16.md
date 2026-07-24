# Lectura amigable del texto original - 2026-07-16

## Intencion

Convertir el extracto oficial de cada oportunidad en una vista de lectura clara sin modificar su contenido ni confundirlo con una interpretacion de la app.

## Cambios

- `prototype/opportunity-actions.js`: separa visualmente el extracto en parrafos, identifica documento, fuente y territorio, escapa el contenido antes de insertarlo, avisa cuando la vista se limita a 2.400 caracteres y evita cierres accidentales al interactuar con el texto.
- `prototype/app-modals-responsive.css`: incorpora una columna de 74 caracteres, interlineado amplio, cabecera fija y scroll interno adaptado a escritorio y movil.
- `prototype/index.html`: renueva las versiones de cache de los dos recursos modificados.
- `scripts/guardrails/check-opportunity-grid-ui.mjs`: exige que el visor conserve la nueva estructura legible y el aviso de recorte.

## Privacidad y trazabilidad

El cambio es exclusivamente de presentacion local. No altera las fuentes, los extractos persistidos, el aislamiento tenant, los permisos ni los puntos de revision humana.

## Verificacion

- Guardarrail de oportunidades y comprobacion visual en navegador local.
- Suite de estabilidad y revision de espacios del diff.
