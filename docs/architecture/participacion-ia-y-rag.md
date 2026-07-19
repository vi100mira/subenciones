# Participación de IA y RAG

## Respuesta corta

El producto ya dispone de un primer RAG privado operativo sobre la plantilla maestra aprobada: para cada candidatura recupera los hechos internos más pertinentes mediante ranking determinista y entrega al redactor únicamente sus referencias. El archivo histórico puede preprocesarse sin esperar a aprobar sus propuestas: queda en un índice FTS local en cuarentena, aislado por tenant y fuente, y no es consultable por el redactor. No existen todavía embeddings semánticos del archivo histórico completo. La búsqueda, descarga, extracción PDF, normalización, hashes, criba, indexación local y recuperación inicial realizan cero llamadas de IA; la generación del borrador sí requiere proveedor, consentimiento y presupuesto.

Esto no significa que la IA deba limitarse a redactar. La arquitectura objetivo la usa también para interpretar bases, sugerir hechos de entidad y explicar encaje, siempre después de una captura verificable y con revisión humana.

## Arquitectura actual comprobada

```mermaid
flowchart LR
  fuentes["BDNS y 15 financiadores oficiales"] --> extraccion["Descarga, PDF y OCR Tesseract"]
  extraccion --> reglas["Normalización, hashes y compuertas"]
  reglas --> corpus[("Corpus público en Supabase")]
  corpus --> interfaz["Ranking y conversación local sin LLM"]
  corpus --> cola["Cola del redactor"]
  cola --> worker["Worker alojado"]
  worker -. "sin clave" .-> espera["awaiting_provider"]
  espera -. "0 llamadas" .-> openai["OpenAI"]
  privada["Documentos de entidad"] --> cribaPrivada["Criba local y propuestas"]
  cribaPrivada --> revisionPrivada["Aprobación humana"]
  revisionPrivada --> ragPrivado["Recuperación de hechos por candidatura"]
  ragPrivado --> cola
```

## Arquitectura objetivo con IA intensiva y gobernada

```mermaid
flowchart TB
  publicas["Fuentes públicas"] --> captura["Captura determinista y versionada"]
  entidad["Web pública consentida"] --> capturaEntidad["Snapshot con límites"]
  privadas["Documentos privados aprobados"] --> limiteTenant["Frontera tenant-private"]

  captura --> iaBases["IA de interpretación de bases"]
  capturaEntidad --> iaEntidad["IA investigadora de entidad"]
  iaBases --> revisionPublica["Revisión de evidencia y citas"]
  iaEntidad --> revisionHechos["Aprobación humana de hechos"]

  revisionPublica --> vectorPublico[("Índice público compartido")]
  revisionHechos --> vectorPrivado[("Índice privado del tenant")]
  limiteTenant --> vectorPrivado

  vectorPublico --> recuperacion["Recuperación híbrida"]
  vectorPrivado --> recuperacion
  recuperacion --> iaEncaje["IA explica encaje, riesgos y ausencias"]
  iaEncaje --> decision["Decisión humana"]
  decision --> iaRedactor["IA redactora"]
  iaRedactor --> revisionFinal["Revisión humana antes de exportar o compartir"]
```

## Papel de cada capacidad

| Capacidad | IA actual | IA objetivo | Estado |
| --- | --- | --- | --- |
| Descubrimiento de convocatorias | No; API y rastreo determinista | IA solo clasifica casos dudosos después de capturar evidencia | Operativo sin IA |
| Interpretación de bases | Reglas y extracción de texto | Salida estructurada con requisitos, límites, criterios y citas | Pendiente |
| Investigación de entidad | No existe worker | Analiza snapshots de web pública consentida y propone hechos | Pendiente |
| RAG público | Corpus sin embeddings operativos | Índice vectorial compartido de fuentes públicas versionadas | Pendiente |
| RAG privado | Recuperación tenant-scoped de hechos aprobados y un índice FTS histórico local en cuarentena | Promover fragmentos revisados y añadir embeddings privados con modelo local o proveedor autorizado | Primer corte operativo |
| Encaje | Reglas y conversación JavaScript local | Recuperación híbrida más explicación con evidencias | Prototipo |
| Redacción | API, cola, contrato y worker; 0 llamadas | OpenAI sobre contexto mínimo aprobado | Preparado; falta clave |
| Envíos externos | Ninguno | Adaptadores con aprobación explícita | Bloqueado por diseño |

## Por qué la IA no debe rastrear directamente

El modelo no debe ser quien navegue, descargue y decida qué documento es oficial. Primero se captura la fuente, se guarda URL, versión, hash y texto extraído; después la IA interpreta ese artefacto. Así se puede repetir el análisis, comparar cambios, controlar coste y demostrar de dónde sale cada afirmación.

## Privacidad y coste

- Los vectores públicos se comparten entre tenants; los privados nunca salen de su `tenant_id`.
- La investigación de entidad solo usa web pública con consentimiento y genera sugerencias, no hechos aprobados.
- La interpretación con IA se ejecuta únicamente cuando cambia el hash del documento o una persona la solicita con motivo auditado.
- OpenAI recibe contexto mínimo, `store: false` y ninguna información privada en la fase autorizada.
- El presupuesto del redactor está limitado a 20 € al mes. Los demás usos de IA requieren presupuesto y contrato propios antes de activarse.

## Orden de construcción recomendado

1. Aprobar y versionar la plantilla maestra privada.
2. Recuperar por candidatura solo los hechos pertinentes y auditar la selección.
3. Añadir fragmentos históricos aprobados y embeddings privados con consentimiento y presupuesto separados.
4. Completar la recuperación híbrida pública/privada y el encaje explicable.
5. Activar el redactor con proveedor autorizado, prueba real y monitor de coste.
