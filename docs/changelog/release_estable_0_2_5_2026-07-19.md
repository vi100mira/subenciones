# Publicación estable 0.2.5

## Intención

Consolidar y respaldar el trabajo acumulado de Insertia como versión estable antes de su despliegue explícito en Vercel.

## Alcance

- Identidad visual de Insertia como aplicación de Novaterra Software y soporte de marca por tenant.
- Flujos de candidatura, revisión de bases y navegación directa a la tarea correspondiente.
- Preparación documental con pre-rellenado trazable, conocimiento privado autorizado y versiones regenerables.
- Controles de ejecución, historial, auditoría y ayuda contextual para personas no técnicas.
- APIs y trabajadores con aislamiento por tenant, permisos explícitos y revisión humana.

## Privacidad y publicación

- No se incluyen `.env`, configuración local de Vercel, salidas de pruebas de `tmp/` ni documentos originales del tenant.
- No se aplican migraciones remotas durante esta publicación.
- El despliegue de producción usa las variables ya configuradas en Vercel y conserva los controles de autorización existentes.
- Al cambiar de tenant se vacían la versión generada en memoria, los estados de revisión de bases y cualquier visor documental abierto.

## Verificación

- `npm run build`: correcto; versión `0.2.5` generada.
- `npm run check:stability`: correcto; tipado, límites, contratos, aislamiento por tenant, agentes, RAG privado, evidencias y exportación gobernada.
- `check-onboarding-ui.mjs` contra el puerto 3000: correcto; acceso, precios, responsive y ausencia de secretos visibles.
- `check-draft-version-ui.mjs`: correcto; 11 hechos aprobados, pre-rellenado, versión generada y persistencia de la revisión.
- `check-onboarding-e2e.mjs`: comprobación sin escritura omitida al no definir un destino API específico.
- Producción: `https://subvenciones-rag.vercel.app` (`dpl_4QpSEbZdUX5EP3mcDFj9CvJjFFGt`), estado `READY`.
- Smoke test de producción: landing `200`, versión `0.2.5`, interfaz pública correcta y API protegida con `401` sin sesión.

## Riesgo residual

Las migraciones nuevas quedan versionadas en el repositorio, pero deben aplicarse por separado tras revisar RLS, aislamiento por tenant y plan de reversión.
