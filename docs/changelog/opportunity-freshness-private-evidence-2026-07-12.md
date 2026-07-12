# Vigencia de oportunidades y evidencia privada — 2026-07-12

## Intención

Evitar que convocatorias antiguas o índices de financiadores aparezcan como oportunidades vivas y hacer que el escaneo privado lea las bases PDF antes de considerar suficiente la evidencia.

## Archivos

- `scripts/radar/fetch-bdns-latest.mjs`: separa estado de plazo, ciclo histórico y carácter accionable; el fixture del prototipo recibe solo oportunidades accionables.
- `scripts/platform/import-bdns-radar.mjs`: conserva en metadatos la vigencia calculada para auditoría.
- `scripts/platform/deep-scan-open-funders.mjs`: descubre documentos públicos, extrae PDF localmente y registra hash, páginas, texto y fallos.
- `scripts/workers/extract-public-pdf.py` y `backend/requirements.txt`: utilidad local de extracción con `pypdf`, sin servicios externos.
- `scripts/workers/extract-public-pdf.py`: activa OCR por página cuando falta texto y conserva método y confianza; la ausencia de Tesseract produce `ocr_unavailable`.
- `scripts/workers/render-public-page.mjs`: respaldo Playwright para HTML público incompleto o bloqueado, sin autenticación ni envío de formularios.
- `backend/README.md`: requisitos operativos de Tesseract, idiomas y Chromium.
- `scripts/platform/import-open-funders.mjs`: mantiene índices y programas recurrentes como fuentes, no como oportunidades, hasta localizar una edición vigente concreta.
- `prototype/app.js`: aplica la misma compuerta de vigencia a fixtures anteriores que todavía no incluyen el nuevo campo `actionable`.

## Verificación

- `npm run typecheck`.
- Radar BDNS real de tres resultados: 1 accionable y 2 en revisión; el fixture de interfaz contiene solo el accionable.
- Escaneo real de Fundación Bancaja Capaces 2026: bases extraídas, 10 páginas, 16.246 caracteres y SHA-256; clasificación cerrada para archivo.
- Fixture PDF-imagen: OCR requerido y `ocr_unavailable` comunicado correctamente al no existir Tesseract en el host de prueba.
- Fixture JavaScript: el navegador recuperó la convocatoria y el enlace a las bases creados después de cargar el HTML.
- Importadores BDNS y privados ejecutados en modo `dry-run`; 16 fuentes privadas y 9 ediciones concretas vigentes detectadas.

## Riesgos residuales

- El host de producción del worker todavía debe instalar Tesseract y los paquetes `spa`, `cat` y `eng`; el código ya degrada de forma segura mientras falten.
- CAPTCHA, login y protecciones anti-bot siguen siendo límites deliberados y requieren intervención humana.
- La fecha de publicación no sustituye a una fecha final oficial: los casos sin plazo estructurado no se muestran como accionables.
