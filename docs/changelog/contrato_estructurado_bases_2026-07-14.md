# Contrato estructurado de bases

Fecha: 2026-07-14

## Intencion

Sustituir las plantillas documentales genericas por requisitos extraidos de las bases oficiales con URL, hash, pagina y fragmento de evidencia.

## Cambios

- Se incorpora un extractor determinista para beneficiarios, requisitos, actuaciones, documentos, criterios, presupuesto, presentacion, obligaciones y exclusiones.
- Cada clausula conserva evidencia y queda marcada para revision humana.
- El extractor diferencia una clausula nuclear de una mera mencion contextual: un pie de pagina o una referencia aislada ya no abre por si solo el expediente.
- Las frases partidas entre lineas de PDF se reconocen sin modificar la cita original ni su pagina, y el limite de candidatos se aplica por regla para que un pie repetido no oculte una clausula posterior.
- Se amplian encabezados juridicos habituales, modalidades de premios y variantes cooficiales de objeto/finalidad manteniendo las etiquetas funcionales en castellano.
- La ausencia de beneficiarios, actuaciones, documentos o canal bloquea el expediente documental; no se completan huecos por inferencia.
- La campana BDNS combina los contratos de todos los documentos oficiales de una oportunidad.
- La captura BDNS conserva un conjunto documental por expediente: convocatoria principal, otras convocatorias, bases reguladoras y formularios de solicitud. Excluye duplicados cooficiales y documentos posteriores de justificacion o concesion.
- Los formularios y anexos pueden completar la lista documental, pero nunca sustituyen por si solos a las bases juridicas.
- Las URL externas de bases se incorporan junto a los documentos BDNS solo cuando identifican un documento concreto; la portada generica de una sede o boletin no se admite como evidencia.
- Se incorpora recaptura dirigida por codigos BDNS (`--detail-ids`) para reparar expedientes concretos sin reindexar toda la campana.
- El escaner distingue PDF y DOCX incluso cuando el servidor responde como binario generico. Los DOCX se extraen localmente desde OOXML, conservando hash y procedencia, sin enviar el documento a terceros.
- Las bases curadas pueden enlazarse entre intermediarios oficiales, organismo emisor y diario oficial aunque cambie el dominio, siempre que el catalogo declare una autoridad oficial admitida.
- La importacion persiste el contrato junto a la version oficial y lo entrega al expediente tenant.
- Memoria, checklist, anexos y pasos usan primero las clausulas de las bases; las plantillas quedan solo como respaldo visible.
- Se define persistencia platform-public separada para artefactos Blob e interpretaciones versionadas, sin duplicarlas por tenant.
- El proveedor de interpretacion usa JSON Schema estricto, `store: false` y rechaza cualquier cita que no exista literalmente en la pagina declarada.
- Las clausulas del interpretador hibrido solo se marcan como nucleares despues de superar esa verificacion literal; de este modo pueden completar el contrato sin inventar requisitos.
- La campana alojada preserva el texto por paginas en Blob privado una sola vez por hash: los contratos completos pasan a revision y los parciales quedan en cola hibrida.
- El consumidor alojado prioriza paginas con requisitos, documentos, criterios y presupuesto, aplica presupuesto propio y devuelve siempre `review_required`.
- Se incorpora revision de plataforma: cada bloque solo puede aprobarse con citas verificadas y deja revisor, fecha y nota.
- El contrato tenant combina exclusivamente bloques aprobados y solo abre el gestor documental al cubrir beneficiarios, actuaciones, documentos y presentacion.
- El redactor conserva el hash y los identificadores del contrato aprobado, y el worker vuelve a validarlo antes de llamar al proveedor.
- La candidatura ofrece un borrador base solo publico y otro personalizado. Este ultimo exige consentimiento IA vigente y envia unicamente hechos normalizados que la entidad ya aprobo; nunca texto bruto ni documentos completos.
- El interpretador extrae tambien limites de paginas, palabras o caracteres y reglas de formato con cita literal; el redactor sigue bloqueado si no encuentra un limite verificable.
- La salida Word se genera como DOCX OOXML nativo, con jerarquia de propuesta, listas Word reales, referencias a bases y hechos internos aprobados.
- La aprobacion o rechazo humano queda persistido contra el hash inmutable de la salida del agente; cualquier cambio invalida la autorizacion de exportacion.
- Antes de exportar se revalidan la version vigente de la oportunidad, las bases aprobadas y los limites formales. El DOCX y PDF se guardan en Blob privado del tenant.
- La descarga pasa por un endpoint autenticado, sin URL Blob publica ni cache, y exige permiso de gestion del tenant.
- La exportacion nunca habilita presentacion automatica: `submissionAllowed` permanece en `false`.
- Las fuentes oficiales localizadas manualmente se registran por oportunidad como propuestas, con URL, rol documental, autoridad y actor; RLS impide su lectura directa desde un tenant.
- Solo una fuente aprobada por un administrador de plataforma entra en una campana posterior. El worker registra si pudo capturar texto verificable o el error observado.
- El radar propone automaticamente documentos enlazados desde sedes y boletines oficiales cuando falta una base, conserva la ruta de descubrimiento y una puntuacion de coincidencia, pero nunca los autoaprueba.
- El descubridor rechaza dominios externos no oficiales y documentos cuyo ano contradice el curso o ejercicio de la oportunidad; limita oportunidades, semillas, candidatos y tiempo de captura por campana.
- Cuando una sede enlaza la web institucional, el descubridor puede seguir un unico puente cuya identidad coincida con el organismo y recorrer solo unas pocas paginas tematicas del mismo dominio. La ruta completa queda visible para revision.
- El contrato diferencia ahora la ausencia definitiva de evidencia de una convocatoria que anuncia una publicacion oficial todavia no localizada. Conserva la cita, los canales anunciados y comunica que el radar debe volver a comprobarlos.
- Los anuncios de diario oficial que BDNS incorpore se inspeccionan antes que una portada generica; su titulo y autoridad viajan con la semilla para puntuar el documento sin perder procedencia.
- Aprobar la URL no aprueba sus clausulas: la interpretacion conserva una segunda revision humana antes de alimentar el contrato tenant.
- La consola de plataforma permite proponer, aprobar y rechazar estas fuentes y distingue pendiente, captura verificada y captura fallida.
- El contrato del redactor pasa a `draft-output-v2`: cada clausula oficial de documentos obligatorios recibe un `requirementRef` y debe quedar cubierta por el plan documental del agente.
- El plan distingue contenido redactado, formulario oficial, evidencia que debe aportar el tenant, declaracion que requiere cumplimentacion humana y elementos pendientes de clasificar; una omision bloquea la ejecucion antes de revision.
- La revision muestra ese plan y el DOCX aprobado incorpora una hoja interna de control documental, separada conceptualmente de la memoria sometida al limite de paginas.
- Se retira la ruta que aceptaba plantillas `.doc` construidas en el navegador. La interfaz ya no permite preparar ni descargar esos falsos paquetes; solo exporta el resultado del agente cuyo hash fue aprobado.
- El contrato pasa a `draft-output-v3`: la salida contiene documentos identificados, con un unico documento principal y anexos redactables independientes, cada uno enlazado a requisitos y evidencias.
- Todo elemento marcado como redactado debe apuntar a contenido real; referencias vacias, duplicadas, inexistentes o borradores fuera del plan bloquean la ejecucion.
- Tras aprobar el hash completo se genera un expediente ZIP privado con indice de control, un DOCX por borrador y un manifiesto de hashes. Se conservan tambien el DOCX conjunto y el PDF de validacion del documento principal.
- Las menciones de documentacion se clasifican antes de llamar al agente: solicitud, justificacion posterior o contexto procedimental. Solo una obligacion de solicitud concreta puede abrir la puerta documental.
- Los listados que continúan en la pagina siguiente conservan la cita de esa pagina; los puntos de enumeracion (`1.`, `2.`) ya no cortan el fragmento antes de capturar la lista.
- Cada requisito valido recomienda memoria redactable, modelo oficial, declaracion humana o evidencia de entidad. Las clausulas mixtas deben desglosar todas las categorias detectadas; el contrato rechaza un cajon generico de “otros”.
- La candidatura traduce esas categorias a lenguaje operativo: documento que redacta la app, modelo oficial que debe localizarse, declaracion para revisar y firmar, evidencia que aporta la entidad o paquete que debe desglosarse.
- La vista diferencia bases aprobadas, extraccion pendiente de revision, ausencia de lectura estructurada y falta de bloques esenciales; una orientacion local nunca se presenta como requisito oficial confirmado.
- La revision final del agente muestra para cada documento su categoria, preparacion y referencias concretas de las bases que cubre.
- Se retira de la interfaz y se desactiva con HTTP 410 el alta del flujo documental heredado basado en campos planos. Sus resultados historicos siguen disponibles para auditoria, pero toda nueva redaccion parte del contrato de bases aprobado.
- El contrato de requisitos pasa a `schemaVersion: 3` e informa por oportunidad si detecto documentos de solicitud, una mera referencia cruzada, solo contexto, solo justificacion posterior o ninguna evidencia; cada estado declara la siguiente accion y si hace falta otra fuente oficial.
- El clasificador deja fuera subsanaciones, aceptaciones genericas y memorias de justificacion. Los anexos itemizados incluidos en el propio PDF siguen siendo utilizables; una remision vaga a una base o anexo externo continua bloqueada.
- Se incorporan patrones comprobados en bases oficiales castellanas y catalanas para cabeceras normativas, listas que continuan en la pagina siguiente y evidencias frecuentes como extractos bancarios, libro de familia, alta a terceros o convenio regulador.
- Se corrigio el catalogo dirigido de bases, que referenciaba el documento fuera de su ambito al construir la cabecera; una regresion impide que vuelva a romper la recaptura selectiva.

## Verificacion

- Fixture con cuatro paginas y citas trazables.
- Prueba sobre 43 PDF reales: 32 contienen documentacion detectada, 39 canal de presentacion y 11 los cuatro bloques nucleares completos.
- Auditoria consolidada por oportunidad sobre 54 expedientes oficiales: 53 tienen beneficiarios, actuaciones, documentacion concreta de solicitud y presentacion; solo uno queda bloqueado por ausencia de la base vigente completa.
- Casos reales recapturados y combinados: Balmaseda (convocatoria + ordenanza de 63 paginas), Vinaros (convocatoria + ordenanza especifica), Santa Coloma de Farners (convocatoria DOCX + bases del BOP de Girona) y expedientes BDNS con anexos de solicitud separados.
- Los dos DOCX BDNS que antes se trataban como PDF se extraen ahora con estado `ready` y hash SHA-256.
- `npm run radar:audit-bases-coverage -- <bases-scan.json> [otro-scan.json]`
- `node scripts/guardrails/check-grant-requirements.mjs`
- `node scripts/guardrails/check-proposal-constraints.mjs`
- `node scripts/guardrails/check-openai-bases-provider.mjs`
- `npm run check:stability`: suite integral superada, incluida la cobertura documental obligatoria, el DOCX privado aprobado y la prohibicion de presentacion automatica.
- Auditoria de accesibilidad del DOCX de prueba: 0 hallazgos altos, 0 medios y 0 bajos.
- Reapertura con `python-docx`: 19 parrafos, 4 encabezados, una seccion Letter y margenes de una pulgada.
- `npm run typecheck`
- `node scripts/guardrails/check-supplementary-basis-sources.mjs`: 31 aserciones sobre RLS, HTTPS, estados, exclusion de propuestas, anuncios BDNS, puente entre sede y web institucional, vigencia anual, bloqueo de red privada, orden del worker, verificacion y controles de consola.
- `node scripts/guardrails/check-draft-agent-contract.mjs`: exige cobertura completa del plan documental y rechaza cualquier `requirementRef` oficial omitido.
- `node scripts/guardrails/check-approved-draft-export.mjs`: 13 aserciones; el DOCX nativo incluye la hoja interna de control y mantiene prohibida la presentacion.
- Verificacion local de `#view-platform`: el panel aparece en Revisiones sin errores de consola; la consulta autenticada no se forzo porque la migracion sigue sin aplicar.
- Tras incorporar el descubridor, la aplicacion local recarga sin errores de consola, contiene el nuevo script y el contenedor de revision. La sesion seguia en acceso publico, por lo que no se simulo una identidad superadmin para forzar datos.
- `npm run radar:audit-document-plan`: auditoria reproducible mediante un manifiesto de nueve capturas consolidadas.
- Auditoria con fase documental: 125 clausulas de solicitud en las 53 oportunidades completas, 104 listas para planificar, 25 menciones contextuales y 15 bloques de justificacion posterior excluidos; 53 planes representables y 0 fallos de cobertura.
- Clasificador documental: 37 aserciones, incluidas continuidades de pagina, variantes cooficiales, anexos itemizados y exclusion de falsos positivos. El contrato de bases suma 43 aserciones; la politica BDNS, 21.
- Pruebas dirigidas sobre fuentes oficiales: GVA 917963, A Coruna 916424, Siero 917976 y Los Realejos/Tenerife 913808 se extraen desde sus documentos adjuntos; Lleida 915559 y La Pobla de Mafumet 903456 se completan con fuentes oficiales suplementarias verificadas.
- La extraccion local profunda requirio el Python empaquetado del workspace porque el Python predeterminado no tenia `pypdf`. El workflow alojado ya instala y valida esas dependencias; no se introdujo un servicio ni movimiento de datos adicional.
- La aplicacion publica se recargo correctamente en el navegador local. La vista autenticada no se forzo: al recargar se perdio la sesion y no existen credenciales de desarrollo embebidas; la comprobacion interna queda cubierta por guardarrailes de interfaz y debe repetirse visualmente con una sesion autorizada.
- Prueba real con BDNS 918347: el contrato queda en `awaiting_official_publication`, conserva el texto que anuncia la publicacion en BOP, web y tablon municipal, y ordena monitorizar esos canales sin habilitar la redaccion.
- A 14 de julio de 2026, el ultimo BOP de Santa Cruz de Tenerife observado era el numero 83 de 13 de julio y no incluia las bases 2026/2027 de Valverde; la web municipal seguia mostrando la edicion 2025/2026, que el control de vigencia descarta.
- `npm run check:stability`, `npm run typecheck` y `git diff --check` superados tras incorporar el recorrido oficial acotado y el nuevo estado de publicacion pendiente. La aplicacion local cargo los modulos modificados sin errores de consola.

## Archivos principales

- `scripts/radar/fetch-bdns-latest.mjs`: seleccion y recaptura del conjunto documental oficial.
- `scripts/radar/prepare-bdns-bases-scan.mjs`: catalogo por documento y rol.
- `scripts/platform/deep-scan-open-funders.mjs`: captura PDF/DOCX y confianza de fuentes curadas.
- `scripts/workers/extract-public-docx.py`: extraccion OOXML local.
- `scripts/radar/apply-bdns-bases-scan.mjs`: combinacion de evidencia juridica y anexos.
- `scripts/radar/extract-grant-requirements.mjs`: contrato trazable y expresiones castellanas/cooficiales.
- `scripts/radar/audit-bases-coverage.mjs`: medicion reproducible por oportunidad.
- `scripts/radar/audit-document-plan-readiness.mjs` y `scripts/radar/document-plan-audit-inputs.json`: cobertura del plan frente al corpus consolidado, sin mezclar capturas historicas intermedias.
- `src/candidaturePackage.ts`: empaquetado local y privado del expediente aprobado, sin envio ni presentacion externa.
- `scripts/guardrails/check-bdns-evidence-policy.mjs` y `scripts/guardrails/check-grant-requirements.mjs`: regresiones de politica documental.
- `supabase/migrations/20260714190000_platform_supplementary_basis_sources.sql`: registro revisable y persistente de fuentes oficiales suplementarias.
- `api/admin-supplementary-basis-sources.ts` y `prototype/supplementary-basis-sources.js`: alta, revision y estado de captura para superadministracion.
- `scripts/platform/apply-approved-basis-sources.mjs`: incorpora solo fuentes aprobadas al catalogo de una nueva campana.
- `scripts/platform/discover-supplementary-basis-sources.mjs`: descubre candidatos oficiales auditables sin aprobarlos ni usar datos tenant.

## Riesgos pendientes

- El extractor determinista no resuelve por si solo todas las tablas complejas, referencias cruzadas ni lenguaje juridico indirecto; los contratos parciales siguen la cola hibrida y revision humana.
- El mecanismo de fuentes suplementarias ya esta implementado localmente, pero no operara alojado hasta aplicar su migracion y desplegar API/worker; no se han codificado excepciones municipales en el extractor.
- El descubridor sigue enlaces publicos explicitamente asociados a la oportunidad; si la sede no publica o no enlaza la base vigente, mantiene el expediente bloqueado en vez de inferirla.
- No se pudo completar el renderizado visual automatico del DOCX: el entorno no tiene LibreOffice y la exportacion COM de Word se bloqueo. La validacion realizada es estructural y de accesibilidad; antes de publicar conviene una inspeccion visual en un entorno con LibreOffice o Word automatizable.
- Las migraciones `20260714170000_platform_bases_interpretations.sql`, `20260714180000_tenant_draft_human_review.sql` y `20260714190000_platform_supplementary_basis_sources.sql` aun no estan aplicadas en produccion.
- Falta provisionar `BLOB_READ_WRITE_TOKEN`; crear y usar Vercel Blob puede tener impacto de coste y requiere autorizacion expresa.
- El contrato y el empaquetado mult-documento estan probados con salidas sinteticas y el corpus de requisitos, pero aun falta ejecutar borradores reales del proveedor sobre una muestra representativa antes de afirmar calidad de redaccion por oportunidad.

## Continuacion del 15 de julio de 2026

- El BOP de Santa Cruz de Tenerife numero 84 publico la convocatoria BDNS 918347. El descubridor la localiza desde el mapa territorial publico con una puntuacion de 86 y la mantiene como propuesta pendiente de aprobacion humana.
- El PDF oficial tiene 441 paginas. Antes de interpretar se exige coincidencia simultanea del identificador BDNS y del titulo; para Valverde solo se admite la pagina 330. Los requisitos de otros anuncios del mismo boletin quedan excluidos.
- El extracto confirma beneficiarios, finalidad y presentacion, pero no enumera la documentacion obligatoria. El estado pasa a `official_notice_without_application_documents`, con siguiente accion `locate_full_bases_and_application_form`; la redaccion continua bloqueada.
- `scripts/platform/official-journal-source-map.mjs` inaugura el mapa de conectores territoriales con las islas que corresponden al BOP de Santa Cruz de Tenerife, sin datos tenant ni excepciones para Novaterra.
- Verificacion: 37 controles de fuentes suplementarias, 44 del clasificador documental y 45 del contrato/UI; prueba real sobre el PDF oficial con hash `dd97d6da699b912a87ddaa998f5f757824847be86a742235f0d92636bf881abf` y pagina 330; servidor local y API reactivados en el puerto 3000 sin errores de consola.
- Riesgo observado al cierre del 14 de julio: faltaba localizar la lista documental vigente. Queda resuelto en la continuacion siguiente mediante la ficha publica SIA; el modelo normalizado conserva acceso humano gobernado.

## Cierre de la excepcion Valverde, 15 de julio de 2026

- La sede electronica publica la ficha oficial del procedimiento SIA `3196388`. El descubridor ya puede entrar en sedes dinamicas, seguir el procedimiento dentro de la misma sesion y conservar como fuente la raiz HTTPS estable; el token efimero solo queda en la ruta de auditoria.
- La ficha enumera 17 documentos de solicitud. El extractor los conserva por separado, marca 10 como condicionales y evita duplicar una descripcion repetida por el portal.
- La evidencia combinada del BOP numero 84 y la ficha SIA cubre los cuatro bloques nucleares: beneficiarios, finalidad/actuaciones, documentos y presentacion. El contrato queda en `requirements_extracted_for_review`, nunca aprobado automaticamente.
- La descarga de la instancia normalizada conduce al control de identificacion del portal. La app lo comunica como `requires_portal_interaction`: puede preparar el plan y los borradores redactables, pero una persona autorizada debe obtener y verificar el modelo oficial antes de cerrar el expediente.
- Verificacion real: descubrimiento en seco de la raiz oficial como propuesta, recorrido con navegador de dos paginas, SIA `3196388`, 17 documentos, 10 condicionales, evidencia oficial hasheada y combinacion sin bloques esenciales ausentes.
- Archivos: `scripts/workers/render-public-page.mjs`, `scripts/platform/discover-supplementary-basis-sources.mjs`, `scripts/platform/deep-scan-open-funders.mjs`, `scripts/radar/apply-bdns-bases-scan.mjs`, `scripts/radar/extract-grant-requirements.mjs`, `prototype/opportunity-requirements.js`, su identificador de cache en `prototype/index.html` y guardarrailes asociados.
- No se aplicaron migraciones, no se movieron datos tenant y no se desplego a produccion.

## Riesgo residual actualizado

- La lista documental vigente ya esta localizada. Sigue siendo obligatoria la revision humana de sus citas y la obtencion autenticada del modelo oficial; no se automatiza la identificacion, firma ni presentacion.
