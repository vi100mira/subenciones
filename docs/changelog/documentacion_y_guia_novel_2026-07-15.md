# Documentación canónica y guía para usuarios noveles

## Intención

Consolidar los documentos funcionales y técnicos del proyecto y ofrecer ayuda contextual sin presentar un chatbot simulado como IA productiva.

## Cambios

- Se añade un índice documental canónico y referencias específicas de funcionalidad, fuentes y modelo de datos.
- Se actualizan el flujo, el PRD y los estados del plan de ejecución que habían quedado por detrás de la implementación.
- Se incorpora una guía flotante accesible con doce temas verificados, preguntas libres por palabras clave y sugerencias según la pantalla.
- La guía funciona localmente, no consulta red, no lee datos tenant y recuerda que no deben introducirse credenciales ni datos sensibles.
- El chat conversacional del radar permanece separado y se desplaza para no solaparse con la guía.

## Archivos

- `README.md`, `docs/documentation-index.md`, `docs/product/functional-specification.md`, `docs/product/source-map.md`, `docs/product/app-flow.md`, `docs/product/prd.md`, `docs/product/mvp-execution-plan.md`.
- `docs/architecture/data-model-reference.md`.
- `prototype/help-assistant-knowledge.js`, `prototype/help-assistant.js`, `prototype/stitch-theme.css`, `prototype/index.html` y `prototype/opportunity-chat.js`.
- Guardarrailes documentales y de interfaz en `scripts/guardrails/`.

## Privacidad y límites

No se incorpora proveedor, coste, almacenamiento de conversaciones ni movimiento de información. Para evolucionar a RAG conversacional deberán diseñarse autenticación, recuperación por permisos, citas, retención, presupuesto y auditoría antes de enviar contexto a un modelo externo.

## Verificación realizada

- Guardarrailes de documentación y guía: superados, con nueve documentos canónicos y doce temas de ayuda.
- Suite completa `npm run check:stability`, comprobación sintáctica y `git diff --check`: superados.
- Revisión visual en el acceso público a 1280 × 720: el panel queda dentro de la ventana y no bloquea la interacción al cerrarse.
- Pregunta real sobre cambios de plazo: respuesta contextual con versionado, recálculo y revisión humana.
- Cierre con Escape: panel oculto, `aria-expanded=false` y foco devuelto al lanzador.
- Las reglas de ancho móvil y separación respecto al chat del radar quedan cubiertas por el guardarraíl de interfaz.
