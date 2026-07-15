# Insertia Heart-and-Check Mark - 2026-07-15

## Intent

Replace the white document-like shape in the Insertia mark with a red heart, retaining the amber check and the existing teal person/U silhouette.

## Files Touched

- `prototype/assets/insertia/insertia-mark.svg`
- `prototype/assets/insertia/icon-512.png`
- `prototype/assets/insertia/icon-192.png`
- `prototype/assets/insertia/apple-touch-icon.png`
- `prototype/assets/insertia/favicon-48.png`
- `prototype/assets/insertia/favicon-32.png`
- `prototype/assets/insertia/favicon-16.png`
- `prototype/assets/insertia/favicon.ico`
- `prototype/assets/insertia/insertia-mark.png`

## Verification

- Inspected the regenerated 512 px and 48 px PNG assets visually.
- Confirmed the mark remains legible at favicon scale and the files use the requested dimensions.
- Updated the heart to red and regenerated every raster variant from the SVG master.

## Residual Risk

The local-file URL is blocked by the in-app browser security policy, so the static prototype was not opened in that browser. The assets are self-contained and the existing application references were kept unchanged.
