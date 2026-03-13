# PIDIEF

Privacy-first PDF merge and annotation in the browser, with no uploads and no backend.

[Live demo](https://pidief.vercel.app)

## Why PIDIEF exists

Most PDF tools ask users to upload sensitive files to a remote service just to do simple work such as combining pages, adding notes, or marking sections. PIDIEF exists for the common case where that tradeoff is unnecessary.

PIDIEF keeps the workflow local:

- PDFs stay in the browser.
- Rendering, page merging, and export all happen client-side.
- There is no application backend, upload queue, or server-side document processing.
- The app is designed to stay lightweight, understandable, and useful for real PDF review workflows.

## Main features

- Import one or more PDFs and combine them into a single output document
- Reorder, duplicate, and remove pages before export
- Add text annotations, highlights, and arrows directly on top of rendered pages
- Export a final merged PDF with overlays baked in
- Save and reload editor state as JSON for later work
- Page numbering controls with position and start offset
- English and Spanish UI copy
- Fully browser-based workflow

## Screenshots

Add screenshots to `docs/images/` and replace these placeholders:

- `docs/images/editor-overview.png` - full editor layout
- `docs/images/annotation-tools.png` - text, highlight, and arrow tools
- `docs/images/page-management.png` - page list, reorder, duplicate, delete

## Architecture overview

PIDIEF follows a simple local-first model:

- `components/pdf-editor/` contains the editor UI shell and panels
- `hooks/use-pdf-state.ts` owns the application state and editing actions
- `lib/pdf-export.ts` generates the final PDF with `pdf-lib`
- `lib/pdfjs.ts` loads and configures PDF.js for in-browser rendering
- `lib/i18n.ts` stores UI copy
- `app/` contains the Next.js App Router entry points

In practice:

1. A user imports one or more PDFs.
2. `pdfjs-dist` reads page metrics and renders page previews in the browser.
3. The app stores annotations as JSON-friendly overlay state.
4. `pdf-lib` copies source pages into a new PDF and draws the overlays during export.

More detail: [docs/architecture.md](docs/architecture.md)

## Tech stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- `pdfjs-dist` for PDF parsing and rendering
- `pdf-lib` for client-side PDF export and page composition
- Vitest for unit tests
- ESLint and Prettier for code quality

## Local development

### Prerequisites

- Node.js 20+
- npm

### Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

## Available scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run lint:fix
npm run typecheck
npm run test
npm run test:watch
npm run format
npm run format:check
npm run check
```

## Build

```bash
npm run build
npm run start
```

## Deployment

PIDIEF is a static-friendly Next.js app with no required backend services.

### Vercel

```bash
npm run build
```

Set `NEXT_PUBLIC_SITE_URL` to your production URL so metadata and canonical links resolve correctly.

### Other hosts

Any host that can run a standard Next.js production build should work. The project does not require a database, API server, or background jobs.

## How to contribute

Start with [CONTRIBUTING.md](CONTRIBUTING.md), then look at:

- [docs/architecture.md](docs/architecture.md)
- [docs/roadmap.md](docs/roadmap.md)
- [docs/contributor-ideas.md](docs/contributor-ideas.md)

Small, practical contributions are especially welcome: bug fixes, PDF workflow improvements, accessibility, keyboard support, performance work, and documentation.

## Good first contributions

- Add page thumbnails loading states and empty states
- Improve keyboard shortcuts discovery in the UI
- Add an undo/redo history indicator
- Improve touch and mobile interactions for annotation handles
- Document the JSON state format with concrete examples
- Add better error messages for corrupt or password-protected PDFs
- Add tests for page deletion and reorder edge cases
- Replace remaining hard-coded prompts and alerts with UI dialogs

## Roadmap

Current priority areas:

- Better page management: reorder polish, thumbnails, split workflows
- Better editing ergonomics: undo/redo, keyboard shortcuts, mobile input
- Better performance on larger PDFs
- Better accessibility and contributor documentation

Full roadmap: [docs/roadmap.md](docs/roadmap.md)

## Contribution guide summary

- Use `npm run check` before opening a PR
- Keep changes scoped and easy to review
- Add or update tests when changing PDF export or state behavior
- Document user-facing workflow changes
- Open an issue first for larger changes when possible

## Security

Please report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
