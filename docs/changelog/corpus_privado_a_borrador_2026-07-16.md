# Corpus privado a borrador trazable

## Intención

Validar una primera franja vertical local que convierta documentos privados de un tenant en propuestas reutilizables y complete únicamente campos institucionales seguros de una plantilla real. El contenido del cliente y los artefactos generados permanecen fuera del repositorio.

## Archivos tocados

- `scripts/private-corpus/build_master_draft.py`: inventario y extracción local de DOCX, PDF y XLSX; filtros de datos personales; propuestas narrativas con evidencia; perfil maestro en JSON y DOCX.
- `scripts/private-corpus/master_docx.py`: maquetación y geometría del perfil maestro separadas del extractor para facilitar revisión humana.
- `scripts/private-corpus/fill_docx_skeleton.py`: adaptador conservador para el bloque razón social/CIF de una propuesta económica; bloqueo explícito de representante, domicilio personal, importes, fecha, cargo y firma; auditoría por hash.
- `scripts/guardrails/check-private-corpus-document-builder.mjs`: contrato automático de aislamiento, ausencia de red, revisión humana y campos bloqueados.
- `package.json`: incorpora la comprobación específica al conjunto de estabilidad.

## Verificación

- Procesamiento local de 333 documentos compatibles del corpus autorizado.
- 2.519 párrafos candidatos considerados; 65 párrafos con señales personales excluidos por defecto.
- 8 de 8 bloques narrativos cubiertos como propuestas, no como datos aprobados.
- 0 llamadas a servicios de IA o red.
- Primer esqueleto real completado solo con razón social y CIF propuestos.
- Metadatos heredados eliminados de ambos DOCX finales.
- Geometría de tablas validada sin incidencias.
- Render final revisado página por página: tres páginas del perfil maestro y una del esqueleto.

## Riesgos residuales

- La recurrencia documental no sustituye la aprobación del dato maestro: CIF, domicilio y narrativas deben confirmarse en la UI.
- Las narrativas recuperadas pueden ser específicas de un proyecto o anualidad y deben adaptarse a la convocatoria destino.
- Cada familia de plantilla oficial necesita un adaptador probado; no se permite rellenado genérico por semejanza cuando hay ambigüedad.
- Antes de producción faltan almacenamiento cifrado por tenant, control de roles, revocación de fuentes y registro de aprobación en la base de datos.
