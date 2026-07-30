# Mapa nacional: BDNS y conectores territoriales — 2026-07-30

El mapa superadmin separa las oportunidades indexadas desde BDNS del estado de cada conector territorial declarado. Cada conector inactivo comunica evaluación de permisos pendiente, causa, propietario técnico y siguiente paso; no se denomina cola ni implica rastreo programado. Los contadores de revisión humana siguen siendo los eventos persistidos y pueden ser cero.

Archivos: `prototype/public-national-source-catalog-ui.js`, `prototype/index.html` y `scripts/guardrails/check-public-national-source-catalog.mjs`.

Verificación prevista: typecheck y guardarraíl del catálogo nacional. No se activan conectores ni se modifican registros remotos.
