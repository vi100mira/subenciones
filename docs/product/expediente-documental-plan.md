# Plan de producto: expediente documental completo

Auditoría y plan de trabajo del 23 de julio de 2026. Este documento define el salto desde el plan documental orientativo actual hasta un conjunto de entrega comparable a los expedientes reales de una entidad. No describe funcionalidad ya operativa.

## Decisión

El resultado principal de INSERTIA debe ser una **candidatura persistente y tenant-scoped** que reúna:

- requisitos atómicos extraídos de fuentes oficiales;
- modelos oficiales versionados;
- documentos institucionales reutilizables y vigentes;
- documentos específicos del proyecto parcialmente cumplimentados;
- tareas, huecos, revisiones y firmas pendientes;
- un manifiesto final con presencia, versión, hash, vigencia, procedencia y aprobación de cada artefacto.

Un requisito mencionado en un plan no cuenta como documento aportado. Un borrador genérico no cuenta como modelo oficial cumplimentado. La aplicación nunca firma ni presenta.

## Evidencia analizada

La muestra privada se procesó localmente, sin llamadas externas ni reproducción de valores personales:

| Evidencia | Resultado |
| --- | --- |
| Grupos de proyectos | 5 |
| Documentos compatibles | 333: 281 PDF, 44 DOCX y 8 XLSX |
| Volumen | 524.271.182 bytes |
| Paquetes finales o registrados localizados | 7 |
| Entradas de archivo en esos paquetes | 79 |
| Contenidos únicos por SHA-256 | 47 |
| Plantillas candidatas detectadas por el inventariador actual | 26 |
| Bloqueos sensibles | 9 |
| Errores de extracción declarados | 0 |

Cuatro expedientes representativos:

| Expediente | Archivos | Tamaño | Páginas | PDF con campos | Campos AcroForm | Escaneados probables |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Itinerarios GVA/FSE | 14 | 33,8 MB | 492 | 4 | 1.020 | 3 |
| Diputación de Valencia | 10 | 30,5 MB | 243 | 4 | 83 | 1 |
| AITEX | 12 | 11,5 MB | 102 | 3 | 31 | 5 |
| Población Gitana, Alcoy | 12 | 5,4 MB | 42 | 7 | 104 | 3 |

La imagen de la aplicación muestra categorías y esqueletos genéricos. La captura oficial muestra un formulario GVA de 12 páginas ligado a una convocatoria concreta. Las imágenes 2 y 3 recibidas son idénticas por SHA-256.

## Patrón documental observado

| Familia | Ejemplos observados | Reutilización | Tratamiento objetivo |
| --- | --- | --- | --- |
| Identidad institucional | NIF, estatutos, escritura, registro | Alta, con control de versión | Bóveda tenant, no IA |
| Representación | poderes, nombramientos, DNI, certificado de representación | Media; contiene datos personales | Acceso restringido, vigencia y revisión |
| Certificados externos | AEAT, Seguridad Social, ATV, titularidad bancaria | Alta, pero caducan | Emisor, fecha, alcance y vencimiento |
| Solicitud oficial | formulario del organismo | Solo para plantilla/convocatoria | Registro de modelos y mapeo de campos |
| Memoria y proyecto | memoria técnica, objetivos, actividades, indicadores | Parcial | Hechos aprobados más contenido del proyecto |
| Economía | presupuesto, memoria económica, ingresos, cofinanciación | Parcial | Cálculo determinista y reconciliación |
| Evidencia complementaria | planes, protocolos, calidad, convenios, memorias anuales | Condicional | Selección por requisito, no adjuntar por defecto |
| Resultado de registro | justificante, requerimiento, subsanación | No es entrega inicial | Estado posterior y nueva versión del expediente |
| Ejecución/justificación | facturas, nóminas, participantes, seguimiento | Fuera del primer corte | Separar por fase y mayor sensibilidad |

Los documentos comunes no son universales: deben relacionarse con el requisito que satisfacen, su ámbito, vigencia y la convocatoria que acepta ese tipo de prueba.

## Situación actual

### Capacidades aprovechables

- contrato de bases con citas, límites y revisión humana;
- aislamiento tenant en las APIs principales;
- inventario privado local y cuarentena sin IA;
- borradores versionados, aprobación por hash y exportación privada;
- siete adaptadores locales para firmas concretas de PDF/DOCX, incluido el GVA de 347 campos;
- prohibición de firma y presentación automática.

### Brecha crítica

1. No existe una candidatura persistida como agregado documental; parte del estado vive en `sessionStorage`/`localStorage`.
2. La cobertura actual mide referencias incluidas en un plan, no archivos presentes, válidos y aprobados.
3. El ZIP enumera borradores generados, pero no reúne modelos oficiales, certificados ni evidencias aportadas.
4. La UI llama “plantilla preconstruida” a HTML/DOCX genérico, no al documento oficial.
5. El corpus se reduce a unas pocas sugerencias narrativas; no conserva una taxonomía documental reutilizable.
6. La métrica local declara 100 % al cubrir ocho bloques narrativos aunque NIF y domicilio sigan ausentes.
7. Los adaptadores dependen de número exacto de páginas/campos y no forman un registro versionado.
8. La extracción privada corta PDF largos y no incorpora OCR; varios documentos reales son escaneados.
9. Ediciones humanas y artefactos secundarios no se revalidan completamente contra límites y requisitos.
10. La descarga y generación en memoria no soportan paquetes reales de decenas de MB en Vercel Functions.
11. Los guardrails privados inspeccionan cadenas, pero no ejecutan los adaptadores ni garantizan sus dependencias Python.

## Modelo objetivo

Entidades mínimas, todas tenant-scoped cuando sean privadas:

| Entidad | Responsabilidad |
| --- | --- |
| `candidatures` | convocatoria, proyecto, fase, responsable y estado global |
| `candidature_requirements` | requisito atómico, evidencia oficial, obligatoriedad y estado |
| `candidature_artifacts` | archivo, tarea o modelo que satisface uno o más requisitos |
| `artifact_versions` | hash, origen, Blob, clase de dato, firma, vigencia y revisión |
| `tenant_facts` | hechos aprobados con usos, vigencia, localizador y evidencia |
| `tenant_vault_documents` | documentos institucionales reutilizables sin convertirlos en texto global |
| `official_template_versions` | organismo, convocatoria, hash, periodo y estado de validación |
| `document_template_fields` | campo, tipo, límite, repetición, política de fuente y ancla |
| `candidature_field_values` | valor, estado, hecho/evidencia, confianza y decisión humana |
| `artifact_dependencies` | campos, hechos y requisitos que invalidan un artefacto |
| `review_decisions` | aceptación/rechazo por campo, sección, archivo y paquete |
| `bundle_runs` | ensamblado, manifiesto, hashes, controles y recibo de exportación |

Las relaciones privadas deben usar claves foráneas compuestas con `tenant_id`; no basta con confiar en el identificador tenant de la fila hija.

El modelo no tendrá ramas de producto como `gva`, `alcoy` o el nombre de un financiador. Organismo, procedimiento, versión del modelo, secciones, campos, límites y reglas de renderizado serán datos versionados. Los adaptadores específicos solo traducirán un formato físico y deberán implementar el mismo contrato genérico.

## Estados no intercambiables

- `identified`: requisito localizado en fuente oficial.
- `mapped`: existe tipo documental o plantilla que puede satisfacerlo.
- `available`: hay un archivo candidato.
- `valid`: formato, vigencia, firma y correspondencia comprobados.
- `prefilled`: los campos permitidos están materializados.
- `reviewed`: una persona aprobó la versión y sus pendientes.
- `ready_for_bundle`: no quedan bloqueos para ensamblar.
- `exported`: se generó un manifiesto y recibo; no significa presentado.

La cobertura se mostrará en cinco dimensiones: requisitos, artefactos, campos, vigencia y revisión.

## Reglas de seguridad y gobierno

1. DNI, representante y firmas son personales, manual-only y no generan embeddings.
2. Certificados y documentos firmados son inmutables; nunca se rellenan después de firmar.
3. Claves privadas, `.p12`, `.pfx`, credenciales y datos de beneficiarios están prohibidos.
4. Los originales entran en cuarentena; solo hashes y metadatos salen de local hasta aprobación.
5. Cualquier texto derivado guardado en Supabase se declara como contenido remoto.
6. Cada llamada de IA aplica allowlist de campos y DLP; usa solo hechos aprobados y minimizados.
7. Importar, aprobar hechos, revisar candidatura y exportar son permisos separados.
8. Revocar consentimiento invalida contextos y trabajos pendientes mediante una versión de consentimiento.
9. El borrado abarca Postgres, Blob, índices locales y temporales, con recibo auditable.
10. Aprobaciones, exportaciones y auditoría se confirman de forma transaccional o con outbox.

## Flujo objetivo

1. Crear candidatura desde una oportunidad preseleccionada.
2. Congelar versión de convocatoria, bases, anexos y modelos oficiales.
3. Atomizar la lista documental sin truncamientos silenciosos.
4. Resolver cada requisito contra el registro de plantillas y la bóveda del tenant.
5. Mostrar faltantes, caducidades, incompatibilidades y permisos antes de redactar.
6. Materializar campos literales de forma determinista.
7. Calcular presupuesto, porcentajes, fechas y coherencia con reglas reproducibles.
8. Recuperar evidencia aprobada por campo narrativo y proponer texto mínimo.
9. Preguntar únicamente por huecos concretos del proyecto.
10. Revisar por campo/sección; bloquear valores editados frente a regeneraciones.
11. Validar cada artefacto y después el conjunto: cifras, fechas, límites, requisitos y versiones.
12. Ensamblar referencias y artefactos aprobados en un job asíncrono.
13. Entregar ZIP/manifiesto mediante acceso privado temporal; conservar recibo y auditoría.
14. Registrar posteriormente justificante o requerimiento como nueva fase, nunca como parte retroactiva de la entrega inicial.

## Autorrelleno genérico de memorias técnicas

La memoria técnica debe construirse para cualquier organismo a partir de una definición versionada de secciones y campos, no de una plantilla narrativa fija. El sistema debe completar todo lo justificable y dejar pendiente únicamente lo que no pueda respaldarse.

Orden de autorrelleno:

1. **Datos literales verificados.** Identidad de la entidad, territorio, forma jurídica, registros y datos de la convocatoria.
2. **Requisitos oficiales.** Objeto, actuaciones, colectivos elegibles, criterios, límites y estructura exigida.
3. **Conocimiento institucional reutilizable.** Misión, metodología, experiencia, alianzas, capacidad y resultados agregados, recuperados por pertinencia y vigencia.
4. **Datos del proyecto actual.** Objetivos, actividades, calendario, equipo, personas destinatarias e indicadores ya aprobados para la candidatura.
5. **Cálculos reproducibles.** Duraciones, totales, porcentajes, costes unitarios, cofinanciación y consistencia entre narrativa y presupuesto.
6. **Propuesta narrativa.** Redacción asistida solo cuando existan hechos y evidencias suficientes; cada afirmación conserva sus referencias.
7. **Entrevista de huecos.** Cada ausencia genera una pregunta concreta y ligada al campo, no una instrucción genérica de “completar memoria”.

Estados por campo o sección:

- `verified`: copiado o calculado de fuentes aprobadas;
- `proposed`: redactado con evidencia y pendiente de aceptar;
- `missing`: no existe información suficiente;
- `conflict`: las fuentes aprobadas discrepan;
- `not_applicable`: exclusión razonada y revisada;
- `human_only`: firma, declaración o decisión que el sistema no puede realizar.

Si existe modelo oficial, el resultado se vuelca sobre su versión validada. Si solo existe una estructura exigida, se genera un DOCX de trabajo que respeta esa estructura y nunca se presenta como modelo oficial.

La cobertura no se medirá contra campos imposibles de conocer. Para los campos cuya fuente aprobada existe y cuyo uso está permitido, el objetivo es autorrellenar el 100 %. Los restantes deben aparecer como preguntas o tareas explícitas. GVA, Alcoy, diputaciones, ministerios y fundaciones privadas serán fixtures de compatibilidad; ninguno definirá la arquitectura.

## Plan por fases

| Fase | Entregable | Puerta de salida |
| --- | --- | --- |
| 0. Corpus dorado | Cuatro expedientes anonimizados, taxonomía y matriz requisito→archivo | 100 % de archivos clasificados por fase, tipo, reutilización y sensibilidad |
| 1. Seguridad base | RLS por clase, FK tenant-aware, cuarentena, permisos y borrado | Prueba negativa cross-tenant/PII y purga completa |
| 2. Agregado candidatura | Tablas, API y UI de requisitos/artefactos persistentes | Recargar/cambiar dispositivo no pierde estado; cobertura no confunde plan con archivo |
| 3. Bóveda institucional | Versiones, vigencia y reglas de reutilización | AEAT/SS/NIF/registro se reutilizan solo si son válidos y aceptables |
| 4. Registro genérico de modelos | Organismo, procedimiento, plantilla, hash, campos, secciones, anclas, límites y adaptador versionado | Un organismo nuevo se incorpora mediante datos/mapeo; un cambio de plantilla invalida solo la versión afectada |
| 5. Validación de formulario oficial | Aplicar el contrato genérico al formulario GVA de 12 páginas y a modelos estructuralmente distintos | 100 % de campos permitidos con fuente disponible, 0 datos inventados y render visual correcto |
| 6. Motor genérico de memorias | Memoria técnica y económica configurable para cualquier organismo, con autorrelleno por evidencia y entrevista de huecos | Misma canalización sobre GVA, ayuntamiento, diputación y financiador privado; sin ramas por organismo o tenant |
| 7. Ensamblador | Manifiesto completo, artefactos externos y tareas bloqueantes | El ZIP refleja presencia/versión/hash/vigencia de todo requisito |
| 8. Escala | Jobs por página/documento, OCR, caché incremental y descargas firmadas | Paquetes de 30–200 MB sin bufferizar Function ni repetir todo el corpus |
| 9. Validación piloto | Comparación ciega con paquetes históricos | Gestor confirma utilidad, faltantes correctos y ahorro de tiempo |

No debe iniciarse la fase 5 hasta cerrar los bloqueos P0 de seguridad, persistencia y semántica de cobertura.

## Estrategia de pruebas

- contrato: una remisión vaga a un anexo no abre la puerta documental;
- cobertura: requisito mencionado sin archivo permanece pendiente;
- corpus dorado: cada paquete esperado conserva archivos, hashes y clasificación;
- paridad: el ZIP contiene exactamente el conjunto esperado o un bloqueo explícito por cada ausencia;
- plantilla: fixtures por hash/versión, campos, páginas y render pixel/visual;
- memoria genérica: la misma entrada normalizada produce secciones distintas según la definición versionada del organismo, sin cambiar código de dominio;
- autorrelleno: todo campo con fuente aprobada y uso permitido queda `verified` o `proposed`; todo lo demás genera un hueco explícito;
- runtime: instalación limpia de dependencias Python/Node y ejecución real de cada adaptador;
- campos: fuente, vigencia, clase, uso permitido y decisión humana obligatorios;
- coherencia: importes, fechas, porcentajes y valores repetidos;
- privacidad: tenants cruzados, rol insuficiente, PII, consentimiento revocado y archivo malicioso;
- integridad: edición humana vuelve a validar límites y requisitos;
- rendimiento: PDF textual/escaneado/mixto de 200 páginas, 10.000 archivos y ZIP de 5/30/200 MB;
- resiliencia: caída y reanudación por página, documento y ensamblado;
- e2e: crear candidatura, resolver requisitos, completar huecos, aprobar y exportar sin presentar.

Los guardrails por búsqueda de cadenas pueden seguir como controles baratos, pero no cuentan como prueba de expediente completo.

## Métricas del piloto

- porcentaje de requisitos con artefacto válido;
- porcentaje de campos reutilizables verificados/propuestos/pendientes;
- número de faltantes detectados antes de registro;
- documentos caducados o incompatibles bloqueados;
- tiempo humano desde preselección hasta paquete revisable;
- correcciones por documento y reutilización efectiva por tenant;
- precisión/recall de recuperación con evidencia;
- coste, latencia, memoria y reintentos por expediente;
- cero cruces tenant, envíos de PII a IA y presentaciones automáticas.

## Riesgos de planificación

- Las bases pueden no contener la lista completa; formularios y sede electrónica deben completar el contrato sin sustituir la autoridad jurídica.
- Los PDF escaneados y firmados requieren OCR/lectura, no modificación.
- Un modelo oficial nuevo exige mapeo revisado, pero no una rama de producto ni un redactor específico por organismo.
- El autorrelleno máximo depende de la evidencia aprobada disponible; aumentar cobertura nunca permite inventar contenido.
- Los expedientes históricos contienen fases mezcladas y documentos ya obsoletos.
- La suite verde actual valida contratos sintéticos, no paridad con el paquete real.
- La validez de certificados depende de convocatoria, fecha y finalidad.
- Vercel Functions no debe usarse como canal de descarga o generador monolítico de paquetes grandes.
- La calidad narrativa no compensa una lista documental incompleta.

## Próxima decisión

El siguiente corte, todavía sin implementación, debe producir la matriz dorada de los cuatro expedientes: requisito oficial, archivo aportado, familia, reutilización, vigencia, sensibilidad, plantilla/campo y responsable de revisión. Además debe derivar un esquema común de memoria técnica y registrar las variaciones de cada organismo como configuración. Esa matriz será el contrato de aceptación de las fases 2–7 y evitará optimizar de nuevo una UI que solo simula el resultado.
