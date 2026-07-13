# Radar oficial, vivo y municipal — 2026-07-13

## Intencion

Impedir que publicaciones de beneficiarios o programas sin convocatoria aparezcan como subvenciones, ampliar la busqueda a administracion local y exigir bases oficiales extraidas antes de activar una oportunidad.

## Cambios

- Se elimina `Centimos Solidarios` del catalogo global: la unica evidencia procedia de Novaterra, entidad beneficiaria.
- Ford `Construyendo Juntos` queda como programa RSC oficial en vigilancia, nunca como oportunidad sin bases, plazo y solicitud.
- Las fuentes privadas sin edicion concreta y bases verificadas dejan de aparecer como oportunidades vivas.
- La campana municipal BDNS usa `tipoAdministracion=L` y cinco consultas sociales complementarias, con deduplicacion por codigo BDNS.
- Ayudas directas, nominativas, instrumentales y convenios ya asignados no se consideran abiertos a solicitantes.
- Las URLs multiples de bases se separan y escanean como documentos independientes.
- Cuando BDNS contiene el documento completo de convocatoria o bases, se usa su endpoint oficial de descarga como fuente principal; anexos, certificados y extractos no sustituyen a las bases.
- Las paginas HTML solo cuentan como bases si proceden de la URL oficial exacta, contienen requisitos/beneficiarios y conservan hash del texto extraido.
- Los PDF necesitan origen oficial exacto, al menos tres grupos sustantivos de bases, texto suficiente y SHA-256 para activar la oportunidad.
- El extractor PDF usa OCR solo cuando hace falta; la ausencia de OCR no bloquea PDFs que ya contienen texto.
- El extractor fuerza salida UTF-8 en Windows y usa `pdfplumber` como segundo parser para PDF malformados que `pypdf` no tolera.
- Si Tesseract no esta disponible en Windows, el worker usa el OCR nativo `es-ES` de forma local; no envia documentos a terceros.
- Un resolver acotado del BOP de A Coruna sigue referencias explicitas por fecha, exige coincidencia de organismo/titulo en el sumario diario y deriva el PDF oficial; una coincidencia ambigua no se activa.
- Un dataset solo conserva `actionable=true` tras descargar y extraer todas las bases oficiales esperadas.
- El prototipo puede incorporar el radar municipal enriquecido sin duplicar oportunidades del radar general.
- El importador de Supabase rechaza todo registro que no este abierto, accionable y con `basesStatus=extracted`; conserva hashes y evidencia de las bases.
- Un cron diario autenticado a las 05:00 UTC encola la campana municipal sin ejecutar scraping pesado en Vercel.
- La clave diaria `municipal-social:AAAA-MM-DD` hace idempotente la cola aunque Vercel entregue el cron mas de una vez.
- La migracion activa RLS en fuentes y campanas de plataforma sin politicas cliente; solo el backend con service role puede gestionar cola, configuracion y errores operativos.
- El worker offline reclama una campana de forma atomica, ejecuta todo el pipeline y actualiza salud y metricas de la fuente; en dry-run no escribe en Supabase.
- Antes de reclamar una campana, el worker verifica Python y los tres parsers PDF; en produccion tambien exige Tesseract o el OCR nativo de Windows y registra el modo de runtime en el resumen.

## Verificacion

- Consulta real BDNS local: 50 resultados listados, 48 unicos y 25 detalles inspeccionados sin errores.
- Tras aplicar vigencia y acceso: 1 convocatoria competitiva abierta; 6 cerradas y 18 inciertas/no activables.
- Ayuntamiento de Siero: dos documentos oficiales extraidos, 45 paginas, 162.318 caracteres y dos hashes SHA-256.
- El guardrail de autoridad acepta el catalogo de 15 fuentes y el dataset municipal enriquecido sin fallos.
- Dry-run de persistencia: 25 registros escaneados, 1 elegible para Supabase y 24 rechazados por la compuerta de evidencia viva.
- Benchmark municipal ampliado: 75 detalles oficiales, 14 convocatorias competitivas vivas y 0 errores de detalle.
- De las 14 vivas, 13 aportan un documento completo candidato en BDNS; la restante se resuelve desde la referencia oficial al BOP de A Coruna de 2023.
- Resultado final del benchmark: 14 de 14 vivas (100 %) con bases/convocatoria oficial extraida, contenido sustantivo y SHA-256.
- El fallback `pdfplumber` recupero un PDF municipal malformado de 40 paginas y 80.279 caracteres sin relajar el contrato de evidencia.
- El OCR nativo de Windows recupero un BOP escaneado de 33 paginas y 99.598 caracteres, sin errores de pagina.
- El resolver BOP recupero para Arteixo 31 paginas, 72.831 caracteres y hash `2c2b17e0...`; el extracto de 2026 no se uso como sustituto de las bases.
- Prueba integral del worker: 25 detalles, 7 oportunidades vivas con bases extraidas, 18 rechazadas y 0 fallos del guardrail de autoridad; runtime Python 3.12.13 con OCR nativo de Windows.
- Prueba negativa del worker: un Python sin parsers PDF aborta antes de reclamar la cola y explica que debe configurarse `PYTHON_BIN`.

## Riesgos residuales

- La fecha relativa se resuelve desde el anuncio oficial para dias naturales y habiles; expresiones no cubiertas siguen marcadas como inciertas.
- Algunos portales municipales bloquean descarga o enlazan presupuestos generales en lugar de bases concretas; esos casos quedan en revision, no en oportunidades vivas.
- En workers no Windows, el OCR necesita Tesseract y sus idiomas; los PDF con texto se extraen sin esa dependencia.
- El 100 % corresponde a una muestra real de 75 detalles/14 convocatorias vivas, no a todos los BOP de Espana; otros dominios con referencias indirectas necesitaran resolutores equivalentes y deben permanecer en revision hasta entonces.
- Falta aplicar la nueva migracion, configurar `CRON_SECRET` y ejecutar el worker con un runtime persistente antes de activar el cron en produccion.
