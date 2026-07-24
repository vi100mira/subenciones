# Fases de la solicitud visibles en el visor documental

## Intención

El panel lateral del visor de plantillas mostraba botones y mensajes sueltos («Solicitar revisión de bases», «Sin ejecución») sin explicar en qué fase está la solicitud, qué pasos son automáticos y cuál es la siguiente acción de la persona usuaria. Se añade un indicador de fases que responde «¿en qué punto está esta solicitud?» y «¿qué debo hacer ahora?».

## Archivos tocados

- `prototype/opportunity-requirements.js`: nueva función `solicitudPhases` con las cuatro fases (lectura de bases con IA, validación de plataforma, límites de redacción, borrador con revisión humana), quién actúa en cada una, su estado (`hecho`, `en este punto`, `pendiente`, `con incidencia`) y una línea única «Tu siguiente paso». Se refresca con el estado real de la revisión de bases (`applyBasesReviewState`) y del redactor (`draft-agent-run-updated`).
- `prototype/stitch-theme.css`: estilos `.solicitud-phases` reutilizando el lenguaje visual existente (verde `is-done`, ámbar `is-current`); versión compacta en móvil (solo título y estado dentro del límite de 34dvh del panel).

## Privacidad y control

Sin cambios de datos ni de permisos. El panel solo reordena información ya disponible en el navegador y refuerza los mensajes de puertas humanas: ninguna fase sugiere que la aprobación o la presentación sean automáticas.

## Verificación

- `node --check` y `npm run typecheck`: correctos.
- `npm run check:stability`: correcto (solo avisos preexistentes de fuentes archivadas).
- `node scripts/guardrails/check-draft-version-ui.mjs` y `check-tenant-plan-ui.mjs`: correctos.
- Verificación visual con Playwright (`.tmp/verify-solicitud-phases.mjs`): escenario «lectura en cola» (fase 1 activa, siguiente paso «ninguno»), escenario «puertas abiertas» (tres fases hechas, siguiente paso «Generar borrador personalizado») y vista móvil 390 px. Capturas en `.tmp/solicitud-phases-*.png`.

## Riesgo residual

El estado de la fase 1 depende de la respuesta de `/api/bases-review-request`; sin sesión o sin red el panel muestra los cuatro pasos como pendientes con la petición de revisión como siguiente paso, que es el comportamiento conservador correcto.
