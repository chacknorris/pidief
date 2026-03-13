# Architecture

This document is for contributors who are opening the codebase for the first time.

## Core idea

PIDIEF treats imported PDFs as immutable source material. The app never edits the original bytes in place. Instead, it stores page order, annotation overlays, footer data, and pagination settings in client-side React state. Export creates a brand-new PDF by copying source pages and drawing overlays on top.

That design keeps the project:

- privacy-friendly
- browser-native
- backend-free
- easy to reason about

## Main building blocks

### Next.js app shell

- `app/page.tsx` renders the editor
- `app/layout.tsx` defines metadata and the root layout

### Editor UI

- `components/pdf-editor/index.tsx` wires the main editor layout
- `components/pdf-editor/top-bar.tsx` handles import, export, save, load, and language switching
- `components/pdf-editor/left-panel.tsx` shows pages and supports reorder, duplicate, and delete
- `components/pdf-editor/center-canvas.tsx` renders the current page and overlay interactions
- `components/pdf-editor/right-panel.tsx` exposes annotation and pagination controls

### State management

- `types/pdf.ts` defines the shared editor contracts
- `lib/pdf-state.ts` contains reusable initial-state and cloning helpers
- `hooks/use-pdf-state.ts` is the main source of truth
- it stores the imported document model, page metrics, overlays, selection state, pagination options, language, and undo history
- all editing actions flow through this hook

### PDF integration

- `lib/pdfjs.ts` loads and configures PDF.js in the browser
- `pdfjs-dist` reads page count, page metrics, and raster previews
- `lib/pdf-export.ts` uses `pdf-lib` to compose the final downloadable PDF

## How PDFs are loaded

When a user imports a PDF:

1. The file is read into an `ArrayBuffer`.
2. The original bytes are stored in memory so export can copy the original pages later.
3. PDF.js reads the document and extracts:
   - page count
   - page dimensions
   - page viewport transform
   - source index for merged multi-file workflows
4. The app creates an internal page id for each page and adds that page to `document.pageOrder`.
5. Each page gets an empty annotation bucket: texts, highlights, arrows, and footer data.

The editor can import multiple PDFs. Each imported file becomes another entry in `originalPdfSources`, which allows merged export while preserving the origin of each page.

## How rendering works

The center canvas renders one page at a time.

- PDF.js renders the current source page to a `<canvas>`
- overlay elements are rendered as positioned HTML elements on top of that page
- selection, drag, resize, rotate, and lasso interactions update React state
- the visual editor uses page metrics so coordinates remain tied to the source page

The left panel uses PDF.js again for page thumbnails. This is separate from export and only affects the in-browser view.

## How merging works

Merging is not a separate server-side process. It is just page-order composition in client state plus export.

- every page id in `document.pageOrder` points to source metadata in `pageMetrics`
- `pageMetrics` tracks the original `pageIndex` and `sourceIndex`
- export iterates over `document.pageOrder`
- for each entry, `pdf-lib` copies the matching page from the correct source PDF into a new document

Because export copies pages in the current order, reordering pages in the left panel becomes the merged output order.

## How drawing and annotation work

PIDIEF currently supports three overlay types:

- text
- highlight rectangles
- arrows

Each overlay stores layout data directly in state:

- position
- size
- color and style
- text formatting or arrow properties when relevant

The editor modifies those values through state actions in `use-pdf-state.ts`. The center canvas reads them to render the live editing view, and `lib/pdf-export.ts` maps them into PDF coordinates during export.

## How state flows

The main flow looks like this:

1. User triggers an action from the UI
2. A component calls an action from `usePDFState()`
3. The hook updates the page model or document settings
4. UI panels re-render from the updated state
5. Export reads the full document state and produces a new PDF

Undo works by storing previous snapshots of the document state inside the hook.

## Why the app can run fully client-side

PIDIEF depends on two browser-capable libraries:

- `pdfjs-dist` for reading and rasterizing PDFs
- `pdf-lib` for generating the final PDF

Because both operations can run in the browser, the app does not need:

- a file upload API
- a PDF processing backend
- cloud storage
- a database

The only server involved in production is the one serving the web app itself.

## Current limitations

- annotation types are intentionally limited to a small set
- there is no OCR
- there is no editing of original PDF text content
- large files may stress browser memory because sources stay client-side
- undo is local and snapshot-based
- there is no collaboration or multi-user editing
- touch interactions need improvement

## Extension points

Good places for contributors to extend the project:

- add page thumbnails or page management enhancements in `components/pdf-editor/left-panel.tsx`
- add new annotation types by extending the state model, canvas rendering, right-panel controls, and export mapping
- improve export fidelity in `lib/pdf-export.ts`
- improve keyboard support and accessibility in the editor UI
- move more shared PDF logic into focused helpers under `lib/`

## Suggested direction for future structure

The current structure is intentionally small. If the codebase grows, the next clean split would be:

- `components/pdf-editor/` for UI
- `lib/pdf/` for PDF loading, rendering helpers, and export helpers
- `lib/editor/` for coordinate math and annotation helpers
- `types/` for shared document and overlay types

That split is not required yet, but it is the natural next step if more annotation types or export features are added.
