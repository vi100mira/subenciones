# Normalización de fuentes más compacta

Fecha: 2026-07-13

## Intención

Simplificar el flujo de normalización para que no duplique la información de las fuentes y mantenga una navegación estable en pantallas estrechas.

## Cambios

- Se eliminó la pestaña y vista `Ficha`; la revisión con evidencia continúa disponible desde cada fuente mediante `Revisar y normalizar` o `Ver revisión`.
- Las cuatro tarjetas del flujo muestran solo el paso y el punto de información; la aclaración queda accesible al situarse sobre el icono `i`.
- La navegación queda en tres pestañas y su rejilla se adapta al ancho disponible sin crear una segunda fila inesperada.
- La rejilla de pasos usa columnas fluidas, con una sola columna en móvil.

## Archivos

- `prototype/platform-source-manager.js`

## Verificación prevista

- Comprobación estática y pruebas de interfaz locales en la consola de plataforma.

## Riesgo residual

- El detalle de una fuente normalizada se consulta ahora desde su modal de revisión, no desde una pestaña independiente.
