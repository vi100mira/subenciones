# Conector local Windows — 2026-07-31

Se añade una primera instalación local para carpetas privadas. La aplicación emite una sesión temporal por tenant y fuente; el conector escucha solo en `127.0.0.1`, pide la carpeta con el selector nativo de Windows y devuelve únicamente inventario y propuestas sin transferir archivos ni rutas a la plataforma.

El instalador requiere Node 20+, Python 3.11+ y los lectores `python-docx`, `openpyxl` y `pypdf`. No incluye aún empaquetado firmado/autocontenido ni OAuth de Drive/SharePoint. La carpeta de origen mantiene acceso de lectura; la entrega de resultados aprobados queda como capacidad separada.
