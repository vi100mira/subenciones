# Guía alineada con los flujos documentales actuales · 2026-07-26

## Intención

- Actualizar la Guía INSERTIA para explicar con los nombres reales de la interfaz los recorridos incorporados en Base común y Candidatura.
- Sustituir la comprobación superficial del catálogo por preguntas funcionales que detecten respuestas genéricas o desactualizadas.

## Cambios

- La Guía incorpora Base común, vínculo y copia editable por candidatura, consolidación por documento, `Checklist · Carpeta de proyecto`, visores privados y el estado sin agente documental.
- La pantalla `Base común` dispone ahora de sugerencias contextuales propias.
- El selector considera pasos y advertencias, pondera las frases operativas exactas y evita añadir un segundo tema cuando el primero es claramente más relevante.
- El guardrail formula siete preguntas representativas y comprueba tanto el tema elegido como la presencia de los controles que la persona debe utilizar.

## Privacidad y control

- La Guía continúa siendo local: no consulta red, almacenamiento del navegador ni datos del tenant.
- Las respuestas mantienen aislamiento por entidad, auditoría y revisión humana antes de reutilizar, exportar, enviar o presentar documentación.

## Archivos

- `prototype/help-assistant-knowledge.js`
- `prototype/help-assistant.js`
- `prototype/index.html`
- `scripts/guardrails/check-help-assistant.mjs`

## Verificación

- `npm run check:help-assistant`
- Revisión en navegador de las siete consultas funcionales y de las sugerencias de `Base común`.

## Riesgo residual

- La Guía es un asistente determinista basado en temas; las formulaciones muy alejadas del vocabulario de la aplicación pueden seguir solicitando una pregunta más concreta.
