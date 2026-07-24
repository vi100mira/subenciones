# Identidad Novaterra Software en Insertia — 2026-07-16

## Intención

Presentar Insertia como producto propio y, a la vez, como primera aplicación del futuro ecosistema `novaterra.software`. La relación se expresa con una arquitectura de marca respaldada y con los colores institucionales violeta y verde menta de Fundación Novaterra.

## Archivos modificados

- `prototype/index.html`: incorpora la firma del ecosistema en navegación, cabecera y pie, y trata el dominio como previsto, no como enlace activo.
- `prototype/public-entry.js`: añade a la landing la firma «Una aplicación de Novaterra Software» y el contexto de primer producto del ecosistema.
- `prototype/stitch-theme.css`: adapta los tokens principales y las superficies de navegación a la paleta Novaterra.
- `prototype/public-entry.css`: aplica la nueva jerarquía cromática y compone la firma de marca en el acceso público.

## Ajuste de consistencia verde

- Se define una escala única derivada del verde menta Novaterra (`#9CD7B2`) para fondos suaves, bordes y texto accesible.
- Los estados positivos, fuentes operativas, mensajes propios y controles secundarios dejan de mezclar verdes azulados o petróleo.
- El bloque de sesión del sidebar pasa a violeta de ecosistema con acentos menta; advertencias, bloqueos y estados pendientes conservan sus colores semánticos.

## Consistencia de interacción

- El `hover` de las acciones principales permanece en la familia violeta Novaterra y elimina el verde azulado heredado.
- Acciones principales, secundarias e iconos comparten transición breve, elevación de 1 px, retorno al pulsar y foco menta visible.
- Los estados deshabilitados no se elevan y se respeta `prefers-reduced-motion`.

## Composición de acceso en una pantalla

- La ilustración sale de la columna informativa y pasa a ser fondo decorativo del área de acceso, detrás de una tarjeta opaca.
- Se compactan título y ritmos verticales para evitar scroll en escritorio con altura suficiente; móvil y ventanas bajas conservan desplazamiento.
- La firma se simplifica a «Producto del ecosistema digital Novaterra».
- El símbolo visible usa su SVG y sustituye el verde azulado por la escala menta Novaterra.
- Se retira el bloque redundante «Producto del ecosistema» de la columna informativa para evitar que el contenido rebase el alto disponible.
- El logotipo oficial de Fundación Novaterra pasa a la cabecera junto a INSERTIA, con fondo transparente y un separador de marca; se retira del bloque «Consulta sin compromiso».
- En escritorio, las tarjetas altas quedan limitadas al área visible y desplazan internamente su contenido cuando sea necesario, evitando que las pestañas queden bajo la barra del navegador.
- La sesión muestra el logotipo configurado en `tenant_configs.logo_url`; el piloto Novaterra dispone de un fallback local mientras el dato no esté cargado.
- El footer incorpora la marca de Fundación Novaterra como propietario visible del software para todos los tenants, separada de la identidad variable de la entidad operadora.

## Verificación

- `npm run typecheck` completado sin errores.
- `npm run check:line-budgets` completado; todos los archivos vigilados permanecen dentro de presupuesto.
- Revisión visual local de la landing a 1280×720: documento de 720 px, tarjeta completa, ilustración de fondo visible y sin desplazamiento vertical ni horizontal.
- Revisión responsive a 390×844: tarjeta e ilustración conservan su composición, sin desbordamiento horizontal; el desplazamiento vertical se mantiene deliberadamente en móvil.
- Revisión de «Planes y precios» a 1280×720: el contenido izquierdo termina en 664 px, el logotipo oficial carga a 426×117 px y la página no presenta desplazamiento vertical ni horizontal.
- Comprobación en `localhost:3000` de la escala verde: fuente operativa y badge positivo resuelven a fondo `#E4F3E9`, borde/base `#9CD7B2` y texto `#285C3D`; sin errores de consola ni desbordamiento.
- Auditoría en navegador de los estados interactivos: la acción principal resuelve su `hover` con `--teal-dark`; acciones de icono y secundarias comparten fondo `--surface-2`, borde violeta, elevación y sombra; sin errores de consola.

## Riesgo residual

- `novaterra.software` se muestra como dominio previsto y no enlaza mientras no esté adquirido y configurado.
- La denominación «Novaterra Software» deberá validarse como nombre definitivo antes de producir activos de marca registrados.
