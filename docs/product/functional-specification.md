# Especificación funcional

## Propósito

INSERTIA ayuda a entidades sociales a descubrir convocatorias, explicar su encaje y preparar expedientes con evidencia oficial. No decide la elegibilidad legal ni presenta solicitudes automáticamente.

## Roles

| Rol | Responsabilidad principal |
| --- | --- |
| Superadministración | Fuentes públicas, campañas, salud, costes e incidencias técnicas de bases |
| Administración de entidad | Perfil, membresías, consentimientos, datos aprobados y revisiones |
| Gestor de subvenciones | Búsqueda, preselección, candidatura, documentación y borradores |
| Revisor | Validar encaje, bases, documentos y salida final |

## Ciclo funcional

1. Una entidad solicita el alta y obtiene un tenant aislado.
2. Su web pública solo se analiza con consentimiento; las sugerencias no se convierten en perfil hasta revisarlas.
3. Los radares incorporan convocatorias públicas de forma periódica e incremental.
4. El encaje usa el perfil aprobado de una entidad y devuelve razones, riesgos, faltantes y evidencia.
5. Una persona preselecciona, descarta o abre una candidatura.
6. Las bases se localizan, versionan y convierten en requisitos citados.
7. El validador técnico comprueba citas y procedencia; una persona del tenant acepta la interpretación para su candidatura o señala una discrepancia auditada.
8. Desde Asistentes, Preparación documental obliga a elegir una vía: proyectos privados autorizados o formulario guiado. Ambas producen propuestas que una persona debe revisar antes de incorporarlas a la plantilla maestra.
   Para fuentes locales, la carpeta debe seleccionarse expresamente en el dispositivo antes de crear una solicitud de inventario. La ruta absoluta no se persiste ni se transmite a la API y la selección debe repetirse después de recargar.
   Todas las fuentes privadas —local, Drive y SharePoint— deben registrar un preanálisis agregado con cero llamadas de IA antes de entrar en cola. Una fuente vacía, sin `PDF`/`DOCX`/`XLSX` o con contenido compatible prácticamente nulo queda bloqueada. Si contiene menos de tres documentos compatibles o menos de 100 KB, requiere una confirmación humana auditada; la cola vuelve a validar este estado en servidor.
9. La tarjeta y el modal de Preparación documental muestran el estado, la fecha y el resultado agregado de la última ingesta privada. Una ejecución `queued` o `running` no puede duplicarse; una ejecución terminada puede revisarse o actualizarse mediante una nueva acción humana, conservando el historial anterior.
10. En una fuente local, seleccionar y confirmar la carpeta solicita una única ejecución. Al terminar, la Base común muestra cada documento propuesto con nombre, huella, clase, recomendación y estado. Supabase recibe solo esos metadatos mínimos; la ruta local, el contenido y los fragmentos permanecen en el equipo. Aprobar o descartar un documento es una decisión humana auditada y distinta de aprobar los hechos extraídos.
    Tras esa aprobación, una persona puede copiar expresamente el archivo completo al **Archivo de anexos** en Vercel Blob privado. La ruta es opaca y tenant-scoped, se verifica la huella del inventario y la descarga pasa siempre por una función autenticada. Los anexos personales o sensibles se marcan como restringidos y conservan `ai_allowed=false` y `embeddings_allowed=false`.
11. El inventario puede preparar un índice textual local en cuarentena sin esperar a resolver las propuestas. Todo fragmento nace inactivo, aislado por tenant y fuente; la aprobación humana bloquea su uso por el redactor, no su extracción local. Crear embeddings semánticos requiere elegir un modelo local o un consentimiento externo separado.
12. El redactor usa solo requisitos y hechos aprobados, prepara documentos redactables y separa formularios oficiales, evidencias y firmas.
13. La salida permanece privada. Los párrafos redactables pueden editarse en versiones inmutables; cada versión conserva evidencia y requiere aprobación humana de su hash antes de exportarse.
14. La presentación externa queda fuera del sistema.

## Control de ejecución de asistentes

Cada tarjeta de Asistentes expone una banda operativa común con `Modo`, `Última` y `Próxima`. `Última` muestra fecha, estado y actor iniciador; si el tenant no ha ejecutado esa capacidad, debe decirlo expresamente. `Próxima` describe una programación realmente desplegada o la acción humana que la activará, nunca un cron ficticio.

- Búsqueda de convocatorias: campaña de plataforma diaria y ejecución operativa controlada por plataforma.
- Investigador de entidad: ejecución manual para buscar cambios en la web consentida.
- Encaje: ejecución manual después de aprobar el perfil; el cron de quince minutos solo recupera colas ya autorizadas.
- Revisión documental: se activa por expediente o cambio de bases.
- Preparación documental: ejecución manual con fuentes y hechos autorizados; no se programa silenciosamente sobre datos privados.
- Avisos: programables cuando exista un canal activo; mientras no exista, la interfaz debe indicarlo.

Cada ejecución genera eventos tenant-scoped de encolado, inicio, resultado disponible para revisión o fallo. La identidad humana que solicita la cola se conserva separada del proceso alojado que la consume.

## Estados comprensibles

Los trabajos asíncronos usan: `En cola`, `Procesando`, `Pendiente de revisión`, `Bloqueado`, `Completado` y `Error`. Una respuesta HTTP 202 significa encolado, no terminado. La interfaz debe conservar el último estado estable durante el refresco para evitar parpadeos.

## Cambios en convocatorias

- Una convocatoria nueva se normaliza, deduplica y pasa por bases y encaje.
- Un cambio crea una versión; no sobrescribe la evidencia anterior.
- Cambios de plazo, requisitos, importe o anexos generan alerta y revisión selectiva.
- Un borrador basado en una versión sustituida queda invalidado para exportación.
- Una convocatoria cerrada conserva su expediente histórico y bloquea nuevas acciones.

## Reglas del expediente

- Deben constar beneficiarios, finalidad/actuaciones, documentos y presentación.
- Cada documento exigido se clasifica como borrador redactable, modelo oficial, evidencia de entidad o declaración humana.
- Las referencias vagas o bases incompletas bloquean la redacción.
- Los datos privados solo pueden usarse con permiso, minimización y trazabilidad tenant.
- La aprobación de fuentes y la ejecución de ingestas se gestionan en Asistentes; Entidad solo informa del servicio y sus límites.
- Ningún agente firma, envía o presenta.
- Editar un borrador nunca altera bases, requisitos, referencias de evidencia ni versiones anteriores.

## Asistente para usuarios noveles

El asistente flotante explica conceptos, pantallas, estados y siguientes pasos usando conocimiento público del producto. No solicita expedientes, datos personales ni credenciales; no sustituye el análisis de encaje ni la revisión jurídica. Explica también que el conocimiento progresivo pertenece al tenant, requiere aprobación y no es entrenamiento compartido. En su primera versión funciona localmente con respuestas verificadas y muestra sus límites.

## Criterios de aceptación

- Una segunda entidad puede operar sin ver datos privados de la primera.
- Cada recomendación muestra evidencia y riesgos.
- Los cambios relevantes invalidan solo las salidas afectadas.
- Toda salida externa conserva una puerta humana.
- Una persona no técnica puede saber dónde está, qué significa el estado y qué puede hacer después.
