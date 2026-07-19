# Inventario privado de plantillas

## Intención

Separar los esqueletos reales de documentos ya cumplimentados antes de rellenarlos.

## Cambio y privacidad

- `inventory_document_templates.py` inspecciona localmente DOCX, PDF y XLSX y registra hash, estructura, campos seguros, bloqueos, clase de dato y decisión; no copia el texto extraído.
- El inventario queda ligado al tenant, no escribe en el corpus y no realiza llamadas de red o IA.
- Los documentos personales o sensibles quedan como `manual_only` o `blocked_sensitive`; los demás requieren mapeo y aprobación humana antes del prellenado.
- El guardrail comprueba aislamiento, trazabilidad y revisión humana.

## Riesgo residual

La clasificación conservadora debe revisarse antes de mapear cada familia documental y medir su cobertura campo a campo.
