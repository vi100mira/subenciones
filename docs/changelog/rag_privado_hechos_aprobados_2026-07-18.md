# RAG privado sobre hechos aprobados

## Intención

Reutilizar la plantilla maestra del tenant en todas sus candidaturas sin cargar indiscriminadamente todo el corpus ni enviar documentos privados a un proveedor externo.

## Cambio

- El redactor recupera hasta 12 hechos privados aprobados según el título, elegibilidad, criterios, documentos e importe de la convocatoria.
- Solo admite procedencia privada, clase interna, uso `drafting` y ausencia declarada de datos personales o sensibles.
- El manifiesto conserva modo, candidatos, seleccionados y hash de consulta; la auditoría no copia los textos.
- El worker vuelve a validar tenant, estado aprobado y procedencia antes de preparar el contexto.
- La candidatura muestra cuántos hechos examinó y utilizó.
- Las pantallas de Plan y Asistentes describen la capacidad con lenguaje claro como «selección privada»; el término técnico RAG queda en documentación.
- Guía explica que la recuperación cuesta cero llamadas de IA y que la generación puede tener coste separado.

## Privacidad y coste

No se crean embeddings ni se envían los 333 documentos históricos. La recuperación es determinista y tenant-scoped. Los embeddings de fragmentos históricos requieren una autorización y presupuesto independientes.

## Verificación

- Prueba determinista de pertinencia, usos permitidos y exclusión de datos personales.
- Comprobación estática de filtros por tenant, manifiesto, auditoría y UI.
- `npm run check:stability` y typecheck completados correctamente.
- Prueba Playwright del estado visible: hechos candidatos/seleccionados, recuperación con cero llamadas IA y coste de generación separado.

## Estado del piloto

Las 11 propuestas extraídas de los documentos de Novaterra siguen pendientes. El RAG comenzará a utilizarlas solo después de que una persona las apruebe; este cambio no realiza aprobaciones automáticas.
