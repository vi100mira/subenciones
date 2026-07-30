# Análisis nacional de oportunidades públicas — 30 de julio de 2026

## Intención

Sustituir el inventario declarativo del mapa nacional superadmin por una lectura de oportunidades públicas realmente persistidas, sin activar fuentes autonómicas ni mezclar datos de tenants.

## Cambios

- `api/admin-platform-overview.ts` devuelve `nationalOpportunityMap` solo tras autorización superadmin.
- `src/nationalOpportunityMap.ts` agrupa exclusivamente oportunidades `platform_public` enlazadas a una fuente BDNS persistida.
- La clasificación usa códigos NUTS explícitos: las convocatorias estatales se mantienen en ámbito estatal y no se duplican; las multi-territorio cuentan en cada comunidad declarada.
- El mapa diferencia fuente canónica, evidencia HTTPS de versión vigente, fuente territorial declarada y oportunidades indexadas, abiertas verificadas o en revisión humana.
- Cuando una comunidad no tiene registros BDNS clasificables, muestra `Sin datos` y la causa; los diarios autonómicos continúan marcados como no rastreados.

## Verificación y límite

- `npm run typecheck` superado.
- Prueba local en memoria del read-model: Aragón recibe un registro explícito y el estatal no se reparte entre comunidades.
- No se hicieron lecturas/escrituras remotas, no se activaron rastreos ni se aplicaron migraciones.
- La cobertura depende de que la importación BDNS existente persista territorio, fuente y versión vigente; no infiere territorios faltantes.
