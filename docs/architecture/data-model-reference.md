# Referencia del modelo de datos

## Fronteras

El catálogo público se comparte entre entidades. Perfil, documentos, fragmentos, recomendaciones, candidaturas, borradores, permisos y auditoría privada pertenecen a un único `tenant_id` y están protegidos por RLS y comprobaciones API.

## Entidades principales

| Concepto | Ámbito | Relación |
| --- | --- | --- |
| Organización / tenant | Privado | Raíz de configuración y aislamiento |
| Membresía | Privado | Usuario, tenant y rol |
| Configuración y perfil | Privado | Marca, territorio, intereses y hechos aprobados |
| Consentimiento | Privado | Alcance, estado, actor y vigencia |
| Fuente pública | Plataforma | Origen y política de campañas |
| Convocatoria y versión | Plataforma | Identidad canónica, cambios y estado observado |
| Documento/evidencia pública | Plataforma | URL, hash, texto, páginas y procedencia |
| Fuente y documento privado | Privado | Conexión, clasificación, aprobación y tenant |
| Resultado de encaje | Privado | Tenant + versión de convocatoria + perfil aprobado |
| Candidatura | Privado | Decisión humana y etapa del expediente |
| Interpretación de bases | Plataforma revisada | Requisitos citados para una versión oficial |
| Ejecución de agente | Privado o plataforma | Cola, permiso, entrada versionada y resultado |
| Borrador y revisión | Privado | Salida, hash, aprobación e invalidación |
| Evento de auditoría | Según objeto | Actor, tenant, acción, objeto, versión y fecha |

## Invariantes

- No existe un tenant por defecto ni un namespace NovaTerra.
- Todo acceso privado verifica membresía y tenant explícito.
- Un encaje siempre referencia versiones de perfil y convocatoria.
- Una revisión aprueba un hash inmutable; cualquier cambio la invalida.
- Los documentos públicos pueden reutilizarse, los privados nunca cruzan tenants.
- Los adaptadores de canal no contienen lógica de producto.

## Ciclo asíncrono

Las campañas públicas, ingestas privadas y ejecuciones de agentes se representan como trabajos persistidos con identificador, estado, intentos, fechas, error seguro y clave de idempotencia. Los consumidores reclaman trabajos de forma exclusiva y registran métricas y auditoría.

## Almacenamiento

Postgres/Supabase conserva metadatos, relaciones, permisos, colas y auditoría. pgvector separa espacio público y espacios privados. Vercel Blob conserva originales y salidas privadas; las descargas privadas requieren API autenticada y no usan URL pública permanente.
