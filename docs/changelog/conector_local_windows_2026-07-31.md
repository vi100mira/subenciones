# Conector local Windows — 2026-07-31

Se añade una primera instalación local para carpetas privadas. La aplicación emite una sesión temporal por tenant y fuente; el conector escucha solo en `127.0.0.1`, pide la carpeta con el selector nativo de Windows y devuelve únicamente inventario y propuestas sin transferir archivos ni rutas a la plataforma.

El instalador requiere Node 20+. Esta primera versión inventaría nombres, formatos y huellas localmente, sin leer ni transferir el contenido. El análisis semántico local y el empaquetado firmado/autocontenido quedan para una iteración posterior; tampoco incluye aún OAuth de Drive/SharePoint. La carpeta de origen mantiene acceso de lectura; la entrega de resultados aprobados queda como capacidad separada.
