# Medium Issues

These are better suited for contributors who are comfortable reading existing state and rendering code.

## 1. Add undo and redo history for editing operations

- Title: `Implement redo support and improve undo history`
- Description: The editor currently supports undo, but history is snapshot-based and only exposes one direction. Extend it so users can redo actions and contributors can reason about history more safely.
- Expected result: Undo and redo actions are available in the UI and keyboard flow, with tests covering common editing sequences.
- Suggested implementation:
  - Split history state into past and future stacks
  - Keep the public state actions unchanged where possible
  - Add focused tests around selection, page operations, and annotation updates

## 2. Add split PDF workflow

- Title: `Add split PDF support`
- Description: Users can merge and reorder pages, but cannot yet export only a selected subset as a separate document.
- Expected result: A user can select or define pages to export as a new PDF without changing the original imported source files.
- Suggested implementation:
  - Reuse page order and page metrics already stored in document state
  - Add a lightweight selection UI in the left panel or export flow
  - Keep the export path client-side using `pdf-lib`

## 3. Reduce duplicate PDF.js document loading

- Title: `Share PDF.js document cache across thumbnail and canvas views`
- Description: The page sidebar and the main canvas both load PDF.js documents. This adds avoidable complexity and memory overhead.
- Expected result: PDF sources are loaded once and reused by both thumbnail and main-page rendering flows.
- Suggested implementation:
  - Extract a shared document cache or provider
  - Move repeated loading logic out of UI components
  - Validate behavior with multi-file imports

## 4. Improve large-file performance

- Title: `Improve performance for larger PDFs`
- Description: Larger documents can stress the browser because source files and render state stay client-side.
- Expected result: Noticeably smoother navigation and less memory pressure on large documents.
- Suggested implementation:
  - Profile render and import hot spots
  - Avoid unnecessary rerenders and repeated decoding
  - Consider smarter thumbnail/render scheduling before heavier architecture changes

## 5. Add export/import of annotation layers separately

- Title: `Support exporting and importing annotation layers separately`
- Description: Saved JSON currently includes full document state. Some workflows would benefit from sharing annotations independently.
- Expected result: A contributor can export annotation-only data and reapply it to a compatible document.
- Suggested implementation:
  - Define a minimal annotation-layer schema
  - Validate compatibility using page ids or page metrics
  - Document limitations clearly

## 6. Rework center-canvas interactions into smaller modules

- Title: `Modularize center-canvas interaction logic`
- Description: The center canvas is one of the largest and highest-risk files in the project.
- Expected result: Selection, drag/resize, and PDF rendering responsibilities are split into smaller modules or hooks without changing behavior.
- Suggested implementation:
  - Start by extracting pure helpers before moving interactive logic
  - Preserve public behavior and keyboard/mouse semantics
  - Add tests where feasible before and after extraction

## 7. Add a touch-friendly annotation editing mode

- Title: `Improve touch editing for annotations`
- Description: Current resize and rotate interactions are desktop-first.
- Expected result: Annotation handles and gestures are practical on tablets and touch devices.
- Suggested implementation:
  - Audit pointer event handling in the canvas
  - Increase hit targets for handles
  - Test the experience on narrow and touch-first screens
