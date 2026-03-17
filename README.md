# PIDIEF

![GitHub stars](https://img.shields.io/github/stars/chacknorris/pidief?style=social)
![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)
![Demo](https://img.shields.io/badge/demo-live-blue?link=https%3A%2F%2Fpidief.vercel.app)

Privacy-first PDF merge and annotation in the browser, with no uploads and no backend.

[Live demo](https://pidief.vercel.app)

## Start in 5 minutes

```bash
git clone https://github.com/chacknorris/pidief.git
cd pidief
npm install
npm run dev
```

Then open `http://localhost:3000`.

If you only want the fastest contributor path:

1. Run the app locally.
2. Read [CONTRIBUTING.md](CONTRIBUTING.md).
3. Pick a starter task from [docs/good-first-issues.md](docs/good-first-issues.md).

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
- `types/pdf.ts` defines the shared document, page, and overlay contracts
- `lib/pdf-state.ts` contains reusable state factories and cloning helpers
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

## Where to start in the codebase

If you want to contribute quickly:

- Start with `components/pdf-editor/` for visible UI changes
- Use `lib/i18n.ts` for copy and label improvements
- Use `hooks/use-pdf-state.ts` for editing actions and document state behavior
- Use `lib/pdf-export.ts` for final PDF generation behavior
- Read [docs/contributor-ideas.md](docs/contributor-ideas.md) for safe vs central areas

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
- [docs/good-first-issues.md](docs/good-first-issues.md)
- [docs/medium-issues.md](docs/medium-issues.md)
- [docs/community.md](docs/community.md)

Small, practical contributions are especially welcome: bug fixes, PDF workflow improvements, accessibility, keyboard support, performance work, and documentation.

## Good first contributions

- [Add a keyboard shortcuts help modal](docs/good-first-issues.md)
- [Replace browser prompts with app dialogs](docs/good-first-issues.md)
- [Improve the pre-import empty state](docs/good-first-issues.md)
- [Add thumbnail loading placeholders](docs/good-first-issues.md)
- [Cover duplicate/delete page edge cases with tests](docs/good-first-issues.md)
- [Improve invalid PDF error messages](docs/good-first-issues.md)
- [Improve page reorder drag feedback](docs/good-first-issues.md)
- [Improve keyboard focus visibility](docs/good-first-issues.md)
- [Add a sample saved-state JSON fixture](docs/good-first-issues.md)
- [Document safe first contribution areas](docs/good-first-issues.md)

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
- Prefer small PRs over “kitchen sink” refactors

## Security

Please report vulnerabilities privately. See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)
