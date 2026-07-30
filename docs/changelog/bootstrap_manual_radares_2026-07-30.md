# Bootstrap manual de radares — 2026-07-30

La ejecución manual `radares` crea de forma idempotente las fuentes BDNS y privadas mínimas, y encola una campaña por radar y día antes de consumirla. No añade cron, alertas ni matching; las ejecuciones posteriores reutilizan la fuente y no duplican campañas.
