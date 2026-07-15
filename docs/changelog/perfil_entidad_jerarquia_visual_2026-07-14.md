# Perfil de entidad: jerarquía visual

Fecha: 2026-07-14

## Intención

Mejorar la lectura del perfil de entidad sin modificar sus permisos, estados ni el ciclo de alta.

## Cambios

- Se elimina el sufijo visual `demo` del nombre de entidad en esta vista.
- Se añaden iconos a los cuatro estados operativos y al aviso de alta segura.
- Se separa ligeramente el aviso de alta segura de las tarjetas de estado y se refuerza su jerarquía visual.

## Archivos

- `prototype/entity-activation.js`
- `prototype/stitch-theme.css`

## Verificación

- `npm run check:ui`
- `npm run typecheck`
- Vista local en `http://127.0.0.1:3000/#view-entity`: se confirman las cuatro tarjetas, los iconos, el margen de 12 px antes del aviso y la ausencia del sufijo `demo` cuando existe una etiqueta de sesión.

## Riesgo residual

- Solo cambia presentación. El valor almacenado de la sesión conserva `Novaterra demo` para no alterar los datos de prueba ni la autenticación.
