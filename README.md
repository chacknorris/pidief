# PIDIEF

Editor web para cargar PDFs, agregar overlays (texto, resaltados, flechas) y exportar el resultado respetando orden de páginas y métricas originales.

## Funcionalidad clave
- Importa PDFs reales y genera miniaturas/render con `pdfjs-dist`.
- Overlays persistentes: textos editables, resaltados y flechas con grosor y ángulo libre.
- Numeración de páginas configurable en export.
- Export final con `pdf-lib`, respetando orden, tamaños reales y rotación de flechas.

## Controles rápidos
- `Ctrl/Cmd + Z`: deshacer la última acción.
- `Delete` / `Backspace`: borrar elementos seleccionados (fuera de inputs).
- Selección múltiple: arrastra el lasso; usa Shift/Cmd/Ctrl para selección aditiva.
- Flechas: rotación con el handle superior, resize solo en ancho con el handle derecho.

## Scripts
- `npm run dev` — desarrollo.
- `npm test` — Vitest.
- `npm run lint` — ESLint (flat config).

## Notas
- El estado serializa buffers en base64 para rehidratar PDFs/miniaturas.
- La altura de flechas permanece fija al redimensionar; textos/resaltados se pueden redimensionar en ambos ejes.
