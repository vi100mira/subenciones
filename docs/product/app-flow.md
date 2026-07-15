# Flujo de la aplicación

## Navegación de entidad

1. Panel: situación, alertas y siguientes acciones.
2. Oportunidades: corpus vivo y resultados de encaje.
3. Entidad: perfil aprobado y fuentes autorizadas.
4. Asistentes: capacidades, permisos, colas y resultados.
5. Candidatura: preselecciones y expedientes.
6. Auditoría: decisiones, cambios y evidencias.
7. Plan: límites contratados y capacidades reales.

La superadministración añade entidades, fuentes, campañas, operaciones y revisiones de plataforma sin entrar en el espacio privado de un tenant.

## Alta y perfil

1. La persona solicita registrar una entidad.
2. La plataforma valida el alta y crea un tenant aislado.
3. El análisis de la web pública solo se ejecuta con consentimiento.
4. El investigador propone hechos y logotipos con evidencia visible.
5. Una persona acepta o descarta cada sugerencia y aprueba el perfil.
6. El encaje solo utiliza hechos aprobados.

Si no existe consentimiento de web pública, el tenant puede completar el perfil manualmente. No se rastrea la web y el encaje queda bloqueado hasta disponer de información mínima aprobada.

## Radar y encaje

1. Los radares públicos se ejecutan por cron y campañas idempotentes.
2. Las convocatorias se normalizan, deduplican, versionan y vinculan a evidencia oficial.
3. El agente de encaje cruza una versión pública con el perfil aprobado de un tenant.
4. El resultado explica razones, riesgos, datos ausentes, plazo y hechos usados.
5. La persona revisa resultados y decide preseleccionar o descartar.

## Bases y candidatura

1. Una preselección puede abrir expediente sin aprobar todavía la candidatura.
2. La plataforma localiza bases, anexos y formularios; conserva URL, hash y páginas.
3. Extrae beneficiarios, finalidad, documentación y presentación.
4. Una persona revisa las citas y aprueba o rechaza la interpretación.
5. El plan documental separa borradores, modelos oficiales, evidencias y declaraciones.
6. El redactor trabaja de forma asíncrona con contexto mínimo permitido.
7. La revisión humana aprueba el hash completo antes de exportar.
8. La aplicación no firma ni presenta en portales externos.

## Cambios

Una versión nueva de la convocatoria recalcula únicamente los encajes afectados. Si modifica un requisito usado por una candidatura o borrador, estos pasan a `Revisión necesaria`; la versión y decisión anteriores permanecen en auditoría.

## Canales

Los adaptadores futuros de correo, Teams o WhatsApp autentican usuario y tenant, llaman al orquestador y devuelven información mínima. Los detalles privados permanecen en la aplicación mediante enlace profundo. El envío externo todavía no está operativo.

## Puertas humanas

- Aprobar perfil y hechos internos.
- Decidir preselección o descarte.
- Confirmar elegibilidad incierta.
- Aprobar interpretación de bases y citas.
- Completar modelos oficiales y evidencias.
- Revisar y aprobar la salida documental.
- Autorizar cualquier exportación o comunicación externa.
