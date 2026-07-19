# Lote privado de documentos

## Intención

Ejecutar en una sola operación los adaptadores validados sin abrir el acceso a plantillas sensibles o desconocidas.

## Cambio y controles

- `run_private_document_batch.py` valida tenant, inventario, hechos y rutas; genera solo formatos reconocidos y registra el resto como bloqueado o pendiente de mapeo.
- `fill_docx_skeleton.py` exige tenant y hechos aprobados, salvo el modo explícito de borrador con propuestas.
- El manifiesto no copia valores privados, conserva hashes, prohíbe la presentación externa y no modifica el corpus.
- `fill_technical_memory_pdf.py` completa una memoria técnica con la razón social del tenant y seis grupos no personales recuperados de una copia cumplimentada del mismo formulario y proyecto.
- La fecha de firma, representantes y firmas no se leen ni reutilizan; la evidencia queda enlazada por identificador y SHA-256.
- `fill_grant_application_pdf.py` completa once campos institucionales y de proyecto de una solicitud oficial, incluso cuando la plantilla y la evidencia usan castellano/valenciano.
- Teléfonos, correos, representante, cuenta bancaria, oposición, declaraciones, consentimientos, fecha y firma quedan bloqueados por diseño.
- `fill_document_contribution_declaration_pdf.py` completa solo razón social y NIF en una declaración responsable; identidad, DNI, año declarado, casillas y firma permanecen vacíos.
- La copia firmada solo valida que la evidencia pertenece al mismo tenant y deja trazados su identificador y SHA-256; no se reutilizan sus valores personales ni sus decisiones declarativas.
- `fill_gva_itinerary_form_pdf.py` incorpora un Anexo GVA de doce páginas: completa siete bloques maestros seguros y deja sin tocar tablas, cifras, proyecto, presupuesto, declaraciones, representante y firma.
- `fill_other_income_declaration_pdf.py` completa razón social y NIF, pero mantiene vacíos coste, base, IVA, decisión sobre otros ingresos, tabla, fecha y firma.
- La memoria técnica validada se reutiliza también sobre la versión valenciana con la misma estructura de campos; conserva fechas, representantes y firmas vacíos.

## Riesgo residual

Siete familias cuentan hoy con adaptador validado y producen ocho documentos por incluir dos versiones lingüísticas. Las tres plantillas pendientes son memorias económicas que exigen cifras actuales aprobadas.

## Verificación

- Inventario depurado: 333 documentos, 26 candidatos canónicos; las copias cumplimentadas y el duplicado se conservan solo como referencias.
- Lote real autorizado: 8 borradores generados, 3 memorias económicas pendientes, 9 bloqueados por sensibilidad y 6 manuales.
- Lote autoritativo conservado: `batch-run-authorized-19`; se eliminaron contextos efímeros, propuestas intermedias y lotes redundantes tras validar los hashes.
- Cobertura operativa: 8 de 11 candidatos no bloqueados/manuales (73 %); los tres restantes no pueden completarse sin importes vigentes.
- Los ocho recibos de generación declaran explícitamente `personal_values_reused: false`; la ausencia de la propiedad nunca se interpreta como permiso.
- Memoria técnica: 6 de 7 grupos prellenados (86 %), campos de fecha vacíos, cero valores personales reutilizados y hashes de manifiesto/auditoría coincidentes.
- Solicitud oficial: 11 de 26 campos rellenables (42 %), todos los demás campos de texto vacíos, sin campo de firma ni valores personales reutilizados.
- Declaración responsable: 2 de 5 campos de texto rellenados (40 %); representante, DNI, año, tres casillas y firma permanecen vacíos.
- Anexo GVA: 7 de 7 grupos maestros reutilizables cubiertos; 347 campos totales conservados y todos los grupos específicos o sensibles bloqueados.
- Declaración de otros ingresos: 2 de 2 grupos maestros cubiertos; importes, casillas, persona, fecha y firma vacíos.
- Memoria técnica valenciana: 6 de 7 grupos cubiertos (86 %), sin fechas ni valores personales reutilizados.
- Revisión visual: cuatro páginas de la solicitud, dos de la memoria técnica, cinco de la memoria de Diputación y una de la declaración renderizadas sin cortes ni duplicados; el aviso de revisión aparece en todas.
- Pruebas negativas: propuestas no aprobadas y tenant distinto rechazados antes de crear una carpeta de salida.
- `npm run check:stability` y auditoría final de los ocho pares documento/recibo superadas sin errores.
