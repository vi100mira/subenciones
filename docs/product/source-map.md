# Mapa operativo de fuentes

## Fuentes públicas

| Fuente | Cobertura | Captura | Cadencia | Fiabilidad y control |
| --- | --- | --- | --- | --- |
| BDNS/SNPSAP | España, convocatorias públicas | API/fichas oficiales | Cron diario e incremental | Fuente troncal; exige bases y deduplicación |
| BOE, DOGV y BOP | Normativa y anuncios oficiales | HTML/PDF | Al detectar referencia o cambio | Puede contener muchos anuncios; se exige coincidencia de identificador y título |
| Portales autonómicos y municipales | Procedimientos, anexos y formularios | Enlaces públicos acotados | Bajo demanda y revisiones | Respeto de HTTPS, robots y límites de recorrido |
| LABORA y portales sectoriales | Empleo y programas temáticos | API/HTML según fuente | Campañas configuradas | Cobertura no universal; salud visible |
| Fundaciones y financiadores privados abiertos | Convocatorias publicadas | Catálogo curado + rastreo | Campaña diaria | Solo fuente oficial, estado y cierre verificables |

## Fuentes privadas de entidad

PDF, DOCX, correo o Drive/SharePoint solo entran con conexión autorizada, clasificación y `tenant_id`. La ingesta privada no comparte fragmentos ni embeddings con la plataforma o con otro tenant. El consumidor completo de `ingestion_runs` sigue siendo una capacidad pendiente y no debe anunciarse como operativo.

## Campos mínimos

Identificador canónico, organismo, título, territorio, temática, beneficiarios, finalidad, importe, plazo observado, confianza, URL oficial, URL de bases, versión/hash, fecha de captura y evidencia.

## Política incremental

- Indexación inicial por campañas acotadas.
- Comparación posterior mediante hash, versión, ETag o campos observados.
- Reextracción únicamente de documentos nuevos o modificados.
- Evidencia anterior marcada como sustituida, nunca borrada silenciosamente.
- Alertas solo para tenants afectados.

## Riesgos de acceso

No se elude autenticación, CAPTCHA ni controles del portal. Los enlaces dinámicos se recorren en una sesión pública y se conserva una raíz estable; los formularios que requieran identificación deben obtenerlos personas autorizadas. Una fuente no localizada permanece bloqueada, no se inventa.
