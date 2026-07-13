# Workers alojados sin dependencia de Windows — 2026-07-13

## Intención

Consumir las colas de radares y redacción aunque el ordenador local esté apagado. Vercel conserva la planificación y las APIs breves; GitHub Actions ejecuta los procesos largos en runners efímeros.

## Archivos modificados

- `.github/workflows/workers-alojados.yml`
- `scripts/guardrails/check-hosted-workers.mjs`
- `docs/architecture/arquitectura-actual-del-sistema.md`
- `package.json`

## Privacidad, coste y aislamiento

- Solo se copian a secretos cifrados de GitHub la URL y la clave de servicio de Supabase; nunca se incluyen en el repositorio ni en la interfaz.
- Los jobs tienen permiso `contents: read`; la separación por tenant continúa gobernada por Supabase y los workers.
- El OCR se realiza con Tesseract dentro del runner. No se contrata ni se llama a un SaaS de OCR.
- El redactor mantiene `store: false`, evidencia pública, presupuesto mensual de 20 € y revisión humana. Sin `OPENAI_API_KEY` no realiza llamadas externas.
- GitHub Actions queda sujeto a los límites y condiciones de la cuenta; se debe revisar consumo desde la pestaña Actions.

## Verificación

- Guardrail de permisos, secretos, cron y OCR alojado.
- Validación de sintaxis del workflow por GitHub tras la subida.

## Riesgos residuales

- Los cron de GitHub Actions no garantizan ejecución al segundo y pueden retrasarse en periodos de carga.
- El consumidor procesa una ejecución de redactor por job; una acumulación exige ampliar el drenaje con un límite auditable.
- La clave de OpenAI sigue sin instalarse, por lo que el redactor quedará en `awaiting_provider`.
