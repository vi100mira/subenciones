# UI del estado del conocimiento privado · 2026-07-19

## Intención

Explicar a una persona no técnica qué ha preparado Insertia, qué requiere revisión y qué información puede utilizar realmente al redactar.

## Cambios

- La acción principal de un análisis terminado pasa a **Gestionar conocimiento**.
- El nuevo recorrido muestra documentos analizados, propuestas, revisión humana y hechos disponibles.
- Se separan explícitamente los hechos aprobados del archivo histórico en cuarentena.
- Cada operación explica su efecto: revisar, guardar decisiones y preparar una candidatura.
- Guía utiliza los mismos nombres y aclara que volver a analizar la carpeta es opcional.
- En móvil, el cierre permanece en la cabecera y el botón flotante de Guía se oculta mientras el modal está abierto.

## Privacidad

La pantalla consulta únicamente estados y recuentos tenant-scoped. No abre documentos, no mueve fragmentos y no concede permisos de IA.

## Verificación realizada

- TypeScript, historial y Guía superados.
- Flujo UI: el estado muestra 350 documentos, 11 propuestas y 148 fragmentos; el botón abre las 11 tarjetas reales.
- Capturas verificadas en escritorio y móvil sin desbordamiento horizontal.
