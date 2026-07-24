# Propuesta: construcción documental asistida v2

## Decisión

INSERTIA debe dejar de presentar las plantillas como esqueletos uniformes. El objetivo es producir un **documento de trabajo parcialmente cumplimentado**, donde cada dato y cada párrafo indique si está verificado, propuesto para revisión o pendiente.

La mejora se apoya en tres capas separadas:

1. requisitos y campos exigidos por la convocatoria;
2. hechos aprobados y reutilizables de la entidad;
3. contenido específico del proyecto que una persona debe completar o validar.

La IA puede redactar, pero no es la fuente de verdad. La fuente de verdad son las bases versionadas, los hechos aprobados y las decisiones del expediente.

## Diagnóstico del sistema actual

### Lo que ya existe

- Las bases se convierten en requisitos citados, límites y un plan documental.
- El redactor puede producir documentos con secciones, párrafos, evidencia y datos pendientes.
- La salida exige revisión humana y prohíbe la presentación automática.
- Existen documentos y fragmentos tenant-scoped, hechos sugeridos/aprobados, auditoría y exportación privada.

### Por qué la plantilla sigue vacía

- La vista previa de plantilla de `prototype/opportunity-requirements.js` crea siempre campos con el texto `Contenido pendiente`; no consume una ejecución del redactor.
- El redactor solo recibe datos oficiales de la convocatoria y hasta 40 hechos aprobados de `tenant_profile_suggestions`.
- El Investigador de entidad genera principalmente territorio, temas, forma jurídica, programas, colectivos y logo. No construye una ficha documental completa.
- Los documentos y fragmentos internos existen, pero el redactor no recupera de ellos evidencias específicas para cada campo.
- La salida se valida por documento y sección, no campo a campo. No hay cobertura, vigencia ni decisión humana por cada valor.
- El exportador crea un DOCX/PDF genérico; todavía no vuelca valores sobre el modelo oficial concreto.

Resultado: el sistema conoce la estructura del expediente, pero no dispone de una memoria institucional suficientemente rica y gobernada para cumplimentarla con rigor.

## Experiencia objetivo

Al abrir una plantilla, el usuario debe ver un resumen como:

| Estado | Ejemplo | Conducta |
| --- | --- | --- |
| Verificado | Razón social, NIF, forma jurídica, sede, territorio | Se rellena automáticamente y muestra fuente y vigencia |
| Propuesto | Experiencia relacionada, metodología, resultados previos | Aparece redactado y requiere aceptar, editar o rechazar |
| Pendiente | Importe solicitado, responsable del proyecto, cronograma final | Formula una pregunta concreta y bloquea solo el campo afectado |
| Aportar documento | Poderes, certificado tributario, cuentas | No inventa contenido; crea una tarea de anexado |
| Firma humana | Declaraciones y firma | Puede preparar texto, pero nunca firmar ni marcar como presentado |

La cabecera mostrará cobertura real, por ejemplo: `62 % verificado · 23 % para revisar · 15 % pendiente`.

## Ficha maestra de la entidad

No conviene ampliar indefinidamente `tenant_profile_suggestions`. Esa tabla representa sugerencias, no una base estable de conocimiento. Se propone un catálogo tenant-scoped de hechos aprobados.

### Familias de hechos

| Familia | Datos reutilizables |
| --- | --- |
| Identidad jurídica | razón social, NIF, forma jurídica, registros, fecha de constitución, domicilio, ámbito estatutario |
| Representación | cargo firmante, facultades, vigencia del poder; datos personales mínimos y restringidos |
| Misión y actividad | fines, programas, servicios, metodología, territorios y colectivos |
| Experiencia | proyecto, periodo, financiador, importe, rol, actividades, resultados y evidencia |
| Capacidad técnica | perfiles profesionales agregados, dedicaciones, instalaciones, sistemas y alianzas |
| Impacto | indicador, definición, periodo, valor agregado, método de cálculo y fuente |
| Capacidad económica | presupuesto anual, financiación previa, cofinanciación disponible, IVA y costes unitarios |
| Cumplimiento | certificados, planes, protocolos, seguros, igualdad, transparencia y fechas de validez |
| Proyecto actual | objetivos, personas destinatarias, actividades, calendario, presupuesto e indicadores específicos |

No se incorporarán historiales individuales, datos de menores, casos sociales ni narrativas sensibles. Para indicadores se usarán valores agregados.

### Forma mínima de cada hecho

```text
tenant_fact
  tenant_id
  fact_key
  value_json
  data_class
  source_document_id / source_url
  source_locator: página, sección o celda
  source_sha256
  confidence
  status: proposed | approved | rejected | superseded
  allowed_uses: matching | drafting | forms | budget
  valid_from / valid_until
  approved_by / approved_at
```

Los hechos aprobados del perfil actual pueden migrarse a este catálogo. Los hechos nuevos llegarán por entrevista guiada, entrada manual o extracción de documentos, siempre como propuestas pendientes de revisión.

### Mejora progresiva, no entrenamiento autónomo

La capacidad comercial **Preparación documental** contiene un curador de conocimiento y un redactor. El curador convierte proyectos autorizados y correcciones humanas en propuestas tenant-scoped con evidencia; el redactor reutiliza solo las aprobadas. Añadir proyectos diversos puede aumentar la cobertura y calidad, pero un formato nuevo continúa necesitando mapeo y los datos variables deben validarse para cada convocatoria.

La UI presenta dos entradas excluyentes antes de iniciar el trabajo: analizar una fuente privada autorizada o completar una entrevista guiada. El acceso parte de **Asistentes**; **Entidad** ofrece únicamente puntos de información sobre alcance, límites y servicio contratado.

No se modifican pesos de un modelo, prompts globales ni conocimiento compartido. Ninguna propuesta se autoaprueba y ningún aprendizaje privado beneficia a otro tenant.

## Matriz de campos del documento

Cada modelo oficial o documento redactable debe convertirse en una definición versionada de campos:

```text
document_template_field
  template_version_id
  field_key
  label
  section
  value_type
  required
  repeatable
  maximum_length
  source_policy
  render_anchor
```

Para cada candidatura se materializa una respuesta:

```text
candidature_document_field
  tenant_id
  candidature_id
  template_field_id
  value_json
  state: verified | proposed | missing | not_applicable | blocked
  evidence_refs[]
  fact_refs[]
  confidence
  reviewed_by / reviewed_at
```

Así es posible explicar por qué se ha rellenado cada casilla, detectar contradicciones y regenerar solo los campos afectados por un cambio.

## Pipeline propuesto

1. **Interpretar el modelo oficial.** Extraer campos, secciones, límites, tablas, repeticiones y posición de renderizado del DOCX o PDF vigente.
2. **Crear la matriz de demanda.** Relacionar cada campo con requisitos de bases y políticas de fuente.
3. **Recuperar hechos permitidos.** Consultar solo hechos aprobados del tenant, vigentes y autorizados para ese uso.
4. **Autorrellenar datos literales.** Identidad, registros, territorio, datos de convocatoria y fechas se copian de forma determinista, sin IA.
5. **Calcular valores.** Totales, porcentajes, cofinanciación y calendarios se obtienen con reglas reproducibles, no con generación libre.
6. **Redactar narrativa.** Solo para campos narrativos, ensamblar un paquete mínimo de evidencia y producir una propuesta con citas por afirmación.
7. **Detectar huecos.** Convertir cada dato ausente en una pregunta concreta: no `completar memoria`, sino `¿cuántas personas se prevé atender y en qué periodo?`.
8. **Revisar por campo o sección.** Aceptar, editar, rechazar o fijar valores para que una regeneración no sobrescriba decisiones humanas.
9. **Validar coherencia.** Contrastar importes, fechas, cifras repetidas, límites, vigencia documental y contradicciones entre secciones.
10. **Renderizar sobre el modelo.** Priorizar DOCX y PDF con campos rellenables; para PDFs no editables, generar una capa de cumplimentación o un anexo de transcripción claramente identificado.

## Tres modos de ayuda

### 1. Prellenado seguro

Usa datos públicos de la convocatoria y hechos aprobados. Es determinista y puede funcionar sin proveedor de IA. Los datos internos permanecen dentro del tenant.

### 2. Borrador narrativo

Propone metodología, experiencia y coherencia del proyecto usando únicamente evidencia seleccionada. Si interviene un proveedor externo, exige consentimiento `ai_processing`, minimización y `store: false`.

### 3. Completar pendientes

Una entrevista dinámica pregunta solo lo que falta para esa convocatoria. Las respuestas no pasan directamente al documento: primero se clasifican, muestran su uso previsto y requieren aprobación.

## Interfaz de revisión

- Visor del documento real a la izquierda y panel de campos a la derecha.
- Filtros: `Pendientes`, `Para revisar`, `Verificados`, `Anexos` y `Firmas`.
- Al seleccionar un campo: valor, fuente, página, vigencia, clase de dato y quién lo aprobó.
- Acción `Completar 7 datos pendientes` que abre la entrevista de huecos.
- Acción `Regenerar esta sección`, nunca regeneración opaca del expediente completo.
- Valores editados por una persona quedan bloqueados hasta que ella permita sustituirlos.
- Un cambio de bases o de hecho institucional invalida solo los campos dependientes.

## Qué puede rellenarse ya

Con la información pública y el perfil actual se puede completar de inmediato:

- identificación de convocatoria, organismo, fuente, plazo y canal;
- finalidad, actuaciones elegibles, criterios y documentos exigidos;
- nombre de entidad, forma jurídica, territorio, programas y colectivos cuando estén aprobados;
- índice documental, checklist, referencias oficiales y avisos de vigencia.

No debe rellenarse sin nuevos hechos aprobados:

- NIF, registros, representante y poderes;
- cifras de personas atendidas, resultados y experiencia concreta;
- composición y dedicación del equipo;
- importes, cofinanciación, costes e indicadores del proyecto;
- certificados vigentes y declaraciones firmables.

## Información necesaria para el piloto

### Mínimo para demostrar valor

1. Un modelo oficial real prioritario y sus bases vigentes.
2. Estatutos o ficha registral, NIF y datos institucionales vigentes.
3. Memoria de actividades reciente con resultados agregados.
4. Dos o tres proyectos anteriores relevantes, con periodo, financiador, actividades, importe y resultados demostrables.
5. Presupuesto anual o magnitudes económicas autorizadas para reutilización.
6. Catálogo de servicios, metodología y perfiles profesionales agregados.
7. Persona responsable de aprobar hechos y persona responsable de revisar el expediente.

No se necesitan expedientes de beneficiarios, listados nominativos ni documentación sensible. Si un documento mezcla información útil y sensible, debe extraerse únicamente un hecho agregado y aprobarse de forma independiente.

### Alternativa sin cargar documentos

Una entrevista guiada de 30–45 minutos puede crear el primer catálogo: identidad, misión, programas, tres experiencias, cinco indicadores, capacidad técnica y reglas económicas. Después la entidad revisa cada hecho y añade evidencia cuando exista.

## Primer corte implementable

El primer slice debe demostrar profundidad, no cubrir todos los formatos:

1. Catálogo `tenant_facts` con aprobación, vigencia, evidencia y usos permitidos.
2. Entrevista guiada de huecos para identidad, experiencia, capacidad e indicadores.
3. Definición de campos para cuatro tipos: solicitud, memoria técnica, presupuesto y declaración.
4. Motor determinista de autorrellenado y porcentaje de cobertura.
5. Borrador narrativo por secciones con referencias de hecho y evidencia.
6. Visor con estados por campo y bloqueo de ediciones humanas.
7. Exportación a DOCX de trabajo; PDF oficial solo cuando el modelo sea rellenable o tenga mapeo validado.

No requiere un nuevo proveedor ni una nueva base de datos: amplía Supabase, los workers y la UI actuales. Sí requiere migraciones y APIs tenant-scoped, por lo que debe construirse en cortes pequeños y auditables.

## Criterios de aceptación

- Al menos el 60 % de los campos reutilizables del modelo piloto se rellenan sin inventar datos.
- Todo valor autocompletado muestra fuente, vigencia, clase de dato y estado de revisión.
- Todo párrafo narrativo declara los hechos y evidencias utilizados.
- Los cálculos son reproducibles y se validan contra límites oficiales.
- Los campos faltantes generan preguntas concretas y accionables.
- Un dato contradictorio o caducado no se usa silenciosamente.
- Ningún dato cruza tenants ni se envía a IA externa sin permiso explícito.
- La aprobación humana sigue siendo obligatoria antes de exportar y la presentación automática continúa prohibida.

## Recomendación de prioridad

Empezar por **solicitud + memoria técnica** de una convocatoria real. Son las piezas que mejor demuestran el salto desde un esqueleto hasta un expediente útil. Presupuesto, anexos oficiales y PDF se incorporan después de validar la ficha maestra y el mapeo de campos.
