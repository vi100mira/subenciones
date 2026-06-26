# Vercel and TutorTrace Patterns

## Contexto

El proyecto Subvenciones RAG se va a publicar y mantener en Vercel. TutorTrace ya usa Vercel, Supabase, Vercel Blob, endpoints `api/*.ts`, guardrails y trazabilidad de fuentes.

## Problema

El backend inicial estaba orientado a Python/FastAPI local. Eso sirve para experimentar, pero no reflejaba el despliegue principal previsto en Vercel ni el aprendizaje operativo de TutorTrace.

## Solucion

- Se anadio `package.json`, `tsconfig.json` y `vercel.json`.
- Se crearon endpoints Vercel iniciales para subida a Blob, conexiones de fuentes e ingesta encolada.
- Se crearon helpers de respuesta API y Supabase admin.
- Se anadio una migracion Supabase con organizaciones, membresias, fuentes, documentos, chunks, runs y auditoria.
- Se anadio RLS base para limitar lectura/escritura por entidad y rol.
- Se documentaron los patrones adoptados de TutorTrace y el modelo de control del mapa de fuentes.
- Se anadio politica inicial de credenciales y logging, `.env.example` y logger con redaccion basica.
- Se anadio una primera pantalla de Operaciones al prototipo y documentacion de observabilidad/carga.
- Se consolidaron decisiones sobre corpus publico/plataforma, corpus privado/tenant, embeddings privados e indexacion incremental por campanas.

## Casos Cubiertos

- Preservar originales en Blob con ruta por tenant.
- Gestionar fuentes por entidad.
- Encolar ingestas sin hacer trabajos largos en una request.
- Preparar pgvector para chunks.
- Controlar fuentes por roles.

## Casos No Resueltos

- Todavia no hay worker real de extraccion/vectorizacion.
- Todavia no hay UI conectada a estos endpoints.
- Todavia no hay OAuth Google Drive / Microsoft Graph implementado.
