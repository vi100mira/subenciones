# Preseleccion obligatoria antes de Candidatura

## Intencion

Evitar que la lectura de una oportunidad cree o abra directamente un expediente documental. La decision humana de preseleccionar debe preceder a cualquier gestion en Candidatura.

## Flujo resultante

1. La persona consulta el analisis, requisitos y bases desde Oportunidades.
2. Si le interesa, pulsa `Preseleccionar oportunidad`.
3. La decision se guarda mediante el encaje persistido y queda auditada.
4. La gestion documental y la apertura del expediente se realizan posteriormente desde Candidatura.

## Cambios

- Se retiran `Abrir expediente documental` y `Abrir candidatura` del analisis de oportunidad.
- Se incorpora una unica accion de preseleccion, con estado de reconsideracion cuando la oportunidad habia sido descartada.
- Si ya estaba preseleccionada, la vista lo confirma y remite conceptualmente a Candidatura sin abrirla automaticamente.
- Si no existe recomendacion persistida, la preseleccion se muestra como no disponible en vez de crear estado local contradictorio.

## Privacidad y trazabilidad

- La decision usa la API de revision del encaje, aislada por tenant y autenticada.
- No se inicia redaccion, no se crea documentacion y no se envia informacion externa.
- Se mantiene la revision humana previa a cualquier candidatura o salida documental.

## Verificacion

- `node --check prototype/opportunity-requirements.js`
- `node --check prototype/tenant-match-review.js`
- `npm run typecheck`
- `node scripts/guardrails/check-opportunity-grid-ui.mjs`
- `node scripts/guardrails/check-grant-requirements.mjs`
- Comprobacion en navegador: 916 acciones de oportunidad cargadas, ningun boton `Abrir expediente documental`/`Abrir candidatura` y estado seguro `Preseleccion no disponible` cuando no existe encaje persistido en la sesion aislada.
