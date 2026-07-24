# Guía: fuentes públicas y privadas

## Intención

Corregir una explicación incompleta de la guía de ayuda: la cobertura de convocatorias incluye tanto fuentes públicas como financiadores y fuentes privadas autorizadas.

## Cambios

- `prototype/help-assistant-knowledge.js`: aclara el alcance de la búsqueda y del radar, muestra la procedencia pública o privada y conserva el aviso de control de evidencia.
- La guía distingue esas fuentes externas del perfil y documentos privados de cada entidad, que permanecen aislados por tenant y no se comparten como fuentes de convocatoria.

## Verificación

- `node --check prototype/help-assistant-knowledge.js`.

## Riesgos pendientes

- La guía no sustituye la ficha de cada fuente: las condiciones concretas de acceso y evidencia deben seguir visibles en la pantalla operativa correspondiente.
