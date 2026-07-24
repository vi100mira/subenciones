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
4. El sistema verifica técnicamente las citas; una persona de la entidad revisa las cláusulas y las acepta solo para su candidatura o señala una discrepancia.
5. El plan documental separa borradores, modelos oficiales, evidencias y declaraciones.
6. El redactor trabaja de forma asíncrona con contexto mínimo permitido.
7. La persona abre el documento generado, edita únicamente sus párrafos redactables y guarda nuevas versiones sin sobrescribir las anteriores.
8. La revisión humana aprueba el hash de una versión concreta antes de exportar.
9. La aplicación no firma ni presenta en portales externos.

## Cambios

Una versión nueva de la convocatoria recalcula únicamente los encajes afectados. Si modifica un requisito usado por una candidatura o borrador, estos pasan a `Revisión necesaria`; la versión y decisión anteriores permanecen en auditoría.

## Canales

Los adaptadores futuros de correo, Teams o WhatsApp autentican usuario y tenant, llaman al orquestador y devuelven información mínima. Los detalles privados permanecen en la aplicación mediante enlace profundo. El envío externo todavía no está operativo.

## Puertas humanas

- Aprobar perfil y hechos internos.
- Decidir preselección o descarte.
- Confirmar elegibilidad incierta.
- Validar la interpretación de bases para el tenant o señalar una discrepancia.
- Editar y versionar el contenido redactable sin alterar evidencia oficial.
- Completar modelos oficiales y evidencias.
- Revisar y aprobar la salida documental.
- Autorizar cualquier exportación o comunicación externa.
