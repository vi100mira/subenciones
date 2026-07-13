# Núcleo del Investigador de entidad · 2026-07-13

## Intención

Implementar rastreo público determinista antes de conectar cola o IA.

## Límites y privacidad

- HTTPS, mismo dominio, `robots.txt`, 12 páginas, profundidad 2, 90 segundos y 3 MB.
- No lee documentos privados ni sigue descargas o dominios externos.
- Conserva URL, hash y fragmento para cada sugerencia.
- Todas las propuestas quedan `pending` y requieren revisión humana.

## Riesgo residual

- Falta prueba automatizada, persistencia Supabase y ejecución alojada.
