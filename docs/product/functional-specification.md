# Especificación funcional

## Propósito

INSERTIA ayuda a entidades sociales a descubrir convocatorias, explicar su encaje y preparar expedientes con evidencia oficial. No decide la elegibilidad legal ni presenta solicitudes automáticamente.

## Roles

| Rol | Responsabilidad principal |
| --- | --- |
| Superadministración | Fuentes públicas, campañas, salud, costes y revisión de bases |
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
7. Una persona aprueba las citas y el plan documental.
8. El redactor prepara únicamente documentos redactables y separa formularios oficiales, evidencias y firmas.
9. La salida permanece privada y requiere aprobación humana del hash antes de exportarse.
10. La presentación externa queda fuera del sistema.

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
- Ningún agente firma, envía o presenta.

## Asistente para usuarios noveles

El asistente flotante explica conceptos, pantallas, estados y siguientes pasos usando conocimiento público del producto. No solicita expedientes, datos personales ni credenciales; no sustituye el análisis de encaje ni la revisión jurídica. En su primera versión funciona localmente con respuestas verificadas y muestra sus límites.

## Criterios de aceptación

- Una segunda entidad puede operar sin ver datos privados de la primera.
- Cada recomendación muestra evidencia y riesgos.
- Los cambios relevantes invalidan solo las salidas afectadas.
- Toda salida externa conserva una puerta humana.
- Una persona no técnica puede saber dónde está, qué significa el estado y qué puede hacer después.
