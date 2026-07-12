# Backend PMV

Backend inicial para ingesta y gobierno de documentos de subvenciones.

## Estado actual

- Conector funcional de carpeta local para simular Drive corporativo.
- Ingesta idempotente por `tenant_id`, `source_id`, `external_id` y `content_hash`.
- Clasificacion basica por ruta: publico, interno, bloqueado.
- SQLite local para PMV.
- Auditoria de documentos insertados, actualizados y bloqueados.
- Stubs para Google Drive y Microsoft Graph.

## Ejecutar ingesta local

```powershell
python .\backend\scripts\ingest_local.py --root .\data\simulated_drive\Novaterra --list-documents
```

La carpeta `data/simulated_drive/Novaterra` es una fixture de piloto. Los valores por defecto de tenant son genericos (`tenant-demo`) para evitar acoplar la arquitectura a una entidad concreta.

La base local se crea en `backend/var/subvenciones.db`.

## Extracción privada y OCR

El escáner de financiadores usa extracción PDF local y activa OCR solo en páginas con menos de 80 caracteres de texto. Preparación del worker:

```powershell
python -m pip install -r .\backend\requirements.txt
$env:TESSERACT_CMD = "C:\ruta\a\tesseract.exe"
$env:OCR_LANGUAGES = "spa+cat+eng"
npx playwright install chromium
```

Tesseract 5 y los paquetes de idioma `spa`, `cat` y `eng` deben estar instalados en el host del worker. Si falta OCR, la página queda como `ocr_unavailable`; si el HTML está incompleto, Playwright renderiza la URL pública sin iniciar sesión ni enviar formularios. Estos procesos son workers offline y no deben ejecutarse dentro de una Vercel Function.

## Ejecutar API local

```powershell
python -m pip install -r .\backend\requirements.txt
$env:PYTHONPATH = ".\backend"
python -m uvicorn app.main:app --reload --app-dir .\backend
```

Endpoints iniciales:

- `GET /health`
- `GET /tenants/{tenant_id}/documents`
- `POST /ingestions/local-folder`

## Principios

- Ningun documento sensible entra al indice.
- La misma ingesta puede repetirse sin duplicar documentos.
- Una fuente puede ser una carpeta local, Google Drive, OneDrive/SharePoint, API publica o subida manual.
- Los conectores no deciden producto; solo entregan documentos normalizados.
- La capa de servicios decide que se guarda, que se bloquea y que se audita.
