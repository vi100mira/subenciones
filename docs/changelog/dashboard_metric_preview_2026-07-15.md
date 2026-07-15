# Métricas desplegables y encaje sincronizado

## Intencion

Aplicar a las cuatro métricas principales el mismo patrón de contador y visor del mapa de fuentes, y evitar que el Panel muestre «Encaje pendiente» cuando ya existe un cálculo operativo.

## Cambios

- Las cuatro métricas son desplegables a ancho completo y muestran todas las oportunidades relacionadas dentro de una lista con scroll.
- Cada elemento permite abrir el análisis existente sin aprobar ni preseleccionar la oportunidad.
- «Encaje de la entidad» muestra el número de resultados analizados y diferencia carga, cálculo en curso, resultado disponible, revisión humana y error de recuperación.
- El contador del encaje usa el total persistido del agente; el desplegable aclara cuántos resultados tienen representación en el corpus visual actual.
- El Panel solicita el estado al entrar, escucha los eventos del encaje y lo refresca periódicamente mientras permanece visible.
- El estado inicial ya no afirma que falta aprobar el perfil: durante la recuperación muestra «Cargando encaje guardado».

## Privacidad y trazabilidad

- El visor reutiliza exclusivamente las oportunidades ya autorizadas para la sesión del tenant.
- No modifica recomendaciones, decisiones humanas ni candidaturas.
- Los datos privados de otras entidades no se agregan ni se exponen.

## Verificacion realizada

- `node --check prototype/app.js`
- `npm run typecheck`
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`
- Comprobación en navegador: cuatro métricas desplegables, 46 elementos en «Oportunidades disponibles», 46 en «Con plazo abierto» y ausencia del mensaje obsoleto «Aprobar el perfil y calcular encaje» durante la carga.
- Comprobación persistida de Novaterra: último encaje `review_required`, 89 recomendaciones generadas, revisión humana no iniciada y 89 decisiones pendientes.

## Estabilizacion posterior

- El refresco solo publica cambios de estado reales; ya no redibuja Panel y Oportunidades cada cinco segundos cuando nada ha cambiado.
- Un `401` por sesión caducada queda fijado como error estable hasta que se aplique una sesión nueva, evitando la alternancia «cargando / no disponible».
- Los fallos transitorios se reintentan en segundo plano sin sustituir visualmente el error por un estado de carga en cada intento.
- El tamaño de 30 px queda limitado al contador principal; los títulos del visor conservan la tipografía compacta de la interfaz.

## Verificación de la estabilización

- `node --check prototype/tenant-recommendations-runtime.js`
- `node --check prototype/app.js`
- `npm run typecheck`
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`
- Comprobación en navegador durante más de un ciclo de refresco: contenido estable antes y después de 6,5 segundos y títulos del visor calculados a 16 px.
