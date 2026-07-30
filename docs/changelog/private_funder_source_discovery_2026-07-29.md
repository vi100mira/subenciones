# Descubrimiento de nuevas fuentes privadas, 2026-07-29

## Intencion

Abrir un primer canal acotado para descubrir organizaciones privadas potencialmente financiadoras fuera del catalogo fijo, sin promocionarlas al radar ni a recomendaciones de tenants.

## Cambio

- `data/private-open-funders/discovery-providers-v1.json`: registra el directorio publico de la Asociacion Espanola de Fundaciones, su aviso legal, robots y presupuesto de lectura.
- `scripts/platform/discover-private-funder-sources.mjs`: consulta solo el API publico permitido tras comprobar `robots.txt`; conserva solo fundaciones declaradas privadas con la actividad explicita `Ayudas a terceros`, deduplica por organizacion/dominio y emite candidatas `pending_review` con procedencia.
- Las candidatas quedan con `scanner_eligible: false`; no hay escritura en Supabase, alertas ni llamadas de IA. La revision humana debe verificar la URL oficial y una convocatoria publica antes de incorporarla al catalogo existente.

## Verificacion y limite

- La demostracion seca se ejecuta con `npm run platform:discover-private-funder-sources -- --max-pages=1` y deja un artefacto local en `.tmp`.
- Es un unico directorio publico y un presupuesto maximo de 10 paginas/250 candidatas por ejecucion. Aun no persiste la cola de revision ni descubre empresas, bancos o federaciones; esos proveedores requieren aprobacion y sus propias condiciones de uso.
