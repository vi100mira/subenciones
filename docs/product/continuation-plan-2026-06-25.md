# Continuation Plan - 2026-06-25

## Estado Actual

El proyecto ya tiene una primera base real de radar publico sobre BDNS/SNPSAP. El prototipo dejo de depender solo de mocks para oportunidades: si existe `prototype/radar-data.js`, carga oportunidades publicas reales generadas desde la API oficial.

La arquitectura mantiene el enfoque de baja invasion:

- alta minima de entidad
- valor inicial desde radar publico de plataforma
- fuentes privadas solo como capa opcional y tenant-aislada
- superadmin gestiona fuentes/campanas publicas
- entidades consumen el cockpit con su marca y configuracion

## Plan Ejecutado

### 1. Base multi-tenant y plataforma

Implementado:

- `organizations`
- `organization_memberships`
- `tenant_configs`
- `platform_sources`
- `platform_ingestion_campaigns`
- endpoints de alta/listado de entidades por superadmin
- endpoints de configuracion tenant
- endpoints de fuentes/campanas de plataforma
- endpoints tenant-aware para fuentes privadas e ingesta

Archivos clave:

- `api/admin-organizations.ts`
- `api/tenant-config.ts`
- `api/admin-platform-sources.ts`
- `api/admin-platform-campaigns.ts`
- `supabase/migrations/20260624200000_tenant_config.sql`
- `supabase/migrations/20260624201000_platform_sources.sql`

### 2. Prototipo cockpit

Implementado:

- pantalla Panel
- pantalla Oportunidades
- pantalla Entidad
- pantalla Gobernanza
- pantalla Agentes
- pantalla Candidatura
- pantalla Auditoria
- pantalla Plataforma
- pantalla Operaciones

El prototipo ya muestra datos reales del radar BDNS cuando `window.RADAR` existe.

Archivos clave:

- `prototype/index.html`
- `prototype/app.js`
- `prototype/styles.css`
- `prototype/mock-data.js`
- `prototype/radar-data.js`

### 3. Loop Radar Publico BDNS - Vuelta 1

Objetivo: leer ultimas convocatorias publicas desde BDNS/SNPSAP y mostrarlas.

Implementado:

- lectura de `/convocatorias/ultimas`
- enriquecimiento con `/convocatorias?vpd=GE&numConv=...`
- normalizacion a forma interna de oportunidad
- clasificacion de plazo: `open`, `closed`, `uncertain`
- salida a `data/public-radar/bdns-latest.json`
- salida browser-ready a `prototype/radar-data.js`

Comando:

```powershell
npm run radar:bdns -- --pages=1 --page-size=20 --max-details=20
```

### 4. Loop Radar Publico BDNS - Vuelta 2

Objetivo: pasar de ultimas convocatorias a busqueda estatal filtrada.

Implementado:

- `--mode=search`
- uso de `/convocatorias/busqueda`
- filtro estatal `--tipo-administracion=C`
- busqueda textual `--descripcion=social --descripcion-tipo=1`
- retry y delay para evitar `429`
- metricas de calidad

Comando actual reproducible:

```powershell
npm run radar:bdns -- --mode=search --tipo-administracion=C --descripcion=social --descripcion-tipo=1 --pages=1 --page-size=30 --max-details=30 --detail-delay-ms=300 --retries=3
```

Resultado actual:

- 570 resultados potenciales BDNS
- 30 oportunidades normalizadas
- 0 errores de detalle
- 0 duplicados en la muestra
- 6 abiertas
- 14 inciertas
- 10 cerradas
- 14/30 con fecha estructurada de plazo
- 30/30 con URL de bases/sede

### 5. Loop Radar Publico BDNS - Vuelta 3

Objetivo: preparar evidencia oficial sin descargar todavia binarios.

Implementado:

- normalizacion de `documentos`
- normalizacion de `anuncios`
- extraccion de `textPreview` desde anuncio oficial
- creacion de `extractedText` para futuro chunking
- eliminacion del `raw` completo del navegador
- detalle de oportunidad muestra documentos/anuncios oficiales

Resultado actual:

- 30/30 con metadatos de documentos
- 19/30 con anuncios oficiales
- prototipo renderiza documentos oficiales en detalle

## Verificacion Ejecutada

Comando:

```powershell
npm run check:stability
```

Estado:

- TypeScript OK
- line budgets OK
- prototipo OK

Playwright:

- `#view-dashboard` muestra metricas reales del radar
- `#view-opportunities` muestra 30 oportunidades reales BDNS
- detalle incluye evidencia BDNS y documentos/anuncios oficiales
- sin errores JS

Capturas:

- `docs/changelog/public-radar-bdns-playwright.png`
- `docs/changelog/public-radar-bdns-search-playwright.png`

## Fuentes Oficiales Confirmadas

- Portal SNPSAP/BDNS: `https://www.infosubvenciones.es/`
- API base usada: `https://www.infosubvenciones.es/bdnstrans/api`
- OpenAPI oficial: `https://www.infosubvenciones.es/bdnstrans/estaticos/doc/snpsap-api.json`
- Catalogo datos.gob.es: `https://datos.gob.es/es/catalogo/e05250001-base-de-datos-nacional-de-subvenciones`

Endpoints usados:

- `/convocatorias/ultimas`
- `/convocatorias/busqueda`
- `/convocatorias?vpd=GE&numConv=...`

Endpoint siguiente:

- `/convocatorias/documentos?idDocumento=...`

## Siguientes Pasos

### Paso 1: Descarga controlada de documentos oficiales

Objetivo:

- descargar documentos oficiales vinculados a convocatorias BDNS
- guardar metadatos, hash y tamano
- evitar descargas repetidas
- respetar delay/retry

Salida esperada:

- `data/public-radar/documents/...`
- indice JSON con documento, convocatoria, hash, MIME/tamano, fecha

No hacer todavia:

- no embeddings
- no IA
- no fuentes privadas

### Paso 2: Extraccion de texto publica

Objetivo:

- extraer texto de PDFs descargados
- usar anuncio oficial como fallback cuando el PDF falle
- mantener `extractedText` por convocatoria/documento

Salida esperada:

- textos limpios por documento
- metrica de extraccion OK/error
- documentos sin texto marcados como `extraction_status=error`

### Paso 3: Chunking publico

Objetivo:

- trocear textos publicos en chunks
- reutilizar logica de `scripts/workers/chunk-documents.mjs` o crear worker publico equivalente
- preparar estructura pgvector-ready sin llamar aun a embeddings si no hace falta

Salida esperada:

- chunks con `source_id=bdns-snpsap`
- referencia a convocatoria/documento/anuncio
- metadatos de evidencia

### Paso 4: Busqueda semantica o hibrida

Objetivo:

- permitir preguntas tipo: "ayudas estatales abiertas para entidades sociales sin animo de lucro"
- combinar filtros estructurados BDNS con busqueda sobre texto extraido
- mantener explicabilidad: fuente, documento, fragmento, plazo, confianza

Decision pendiente:

- embeddings externos ahora o primero busqueda lexical/hibrida local

### Paso 5: Persistencia Supabase

Objetivo:

- mover el radar de fixture local a tablas reales
- usar `platform_sources`, `platform_ingestion_campaigns`, `source_documents`, `document_chunks`
- mantener fixture `prototype/radar-data.js` solo para demo/local

Salida esperada:

- endpoints de lectura del radar publico
- operaciones reales en panel Plataforma/Operaciones

### Paso 6: Calidad y cobertura

Objetivo:

- muestreo manual de oportunidades
- detectar plazos relativos
- URL health check
- duplicados
- cobertura por organismo/finalidad
- indicadores de confianza

Metricas a seguir:

- total potencial
- normalizadas
- detalle errores
- documentos disponibles
- anuncios disponibles
- plazos estructurados
- plazos inciertos
- abiertas/cerradas
- duplicados
- fallos por rate limit

## Decisiones Abiertas

- Cuantos documentos descargar por convocatoria en la primera pasada.
- Donde guardar binarios publicos en local y luego en Vercel Blob.
- Si el primer buscador debe ser lexical/hibrido antes de embeddings.
- Si conviene separar `GrantCall` como tabla propia frente a reutilizar `source_documents`.
- Frecuencia de sync BDNS: diaria al principio, incremental por hash/version despues.

## Regla De Producto

La entidad debe poder obtener valor con datos minimos:

1. alta minima
2. busqueda en radar publico
3. matching basico por perfil
4. fuentes privadas solo si quiere precision adicional

El radar publico es valor de plataforma. El RAG privado es opcional y solo sobre fuentes de oportunidades aprobadas por cada tenant.
