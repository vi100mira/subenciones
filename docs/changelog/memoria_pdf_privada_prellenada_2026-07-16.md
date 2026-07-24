# Memoria PDF privada prellenada

## Intención

Demostrar el completado trazable de un modelo oficial rellenable sin sacar el corpus del tenant.

## Cambio

- `fill_diputacion_memory_pdf.py` valida la versión de cinco páginas y 71 campos, prellena identidad, fundamentación, metodología y medios, y deja objetivos y presupuesto bloqueados.
- Los campos prellenados quedan en solo lectura para evitar sobrescrituras accidentales; los huecos siguen editables y todas las páginas muestran que es un borrador.
- La auditoría registra hashes, fuentes, huecos y cobertura sin duplicar los valores privados.

## Privacidad y riesgo residual

El procesamiento es local y sin IA externa. Esta prueba usa propuestas no aprobadas solo mediante una opción explícita; la presentación externa queda prohibida. Faltan adaptar objetivos, calendario y presupuesto a una convocatoria concreta.
