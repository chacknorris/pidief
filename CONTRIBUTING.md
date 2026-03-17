# Contributing to PIDIEF

PIDIEF aims to be easy to understand in a few minutes, easy to run in a few more, and safe to extend without introducing backend complexity. Contributions that keep the project simple, local-first, and reliable are the best fit.

## Project philosophy

PIDIEF is intentionally a small tool.

- Keep the app browser-native and local-first
- Avoid unnecessary backend or service complexity
- Prefer explicit code over clever abstraction
- Optimize for real document workflows, not feature count
- Make changes easy for the next contributor to understand

## Before you start

- Read [README.md](README.md) for product context.
- Read [docs/architecture.md](docs/architecture.md) before changing PDF logic or editor state.
- Check [docs/roadmap.md](docs/roadmap.md) and [docs/contributor-ideas.md](docs/contributor-ideas.md) for high-value work.

## Run the project locally

### Prerequisites

- Node.js 20+
- npm

### Setup

```bash
git clone https://github.com/chacknorris/pidief.git
cd pidief
npm install
npm run dev
```

Open `http://localhost:3000`.

The app should be running in under 5 minutes on a standard Node 20+ setup.

### Quality checks

```bash
npm run lint
npm run typecheck
npm run test
npm run check
```

## How to propose a change

1. Open an issue for bugs, feature ideas, or larger design changes.
2. For small fixes, you can open a PR directly.
3. Keep each PR focused on one problem or one coherent improvement.
4. Explain the user impact, tradeoffs, and testing in the PR description.

## Good first contribution path

1. Pick an item from [docs/good-first-issues.md](docs/good-first-issues.md).
2. Read the relevant UI or state file before editing.
3. Run the app locally and reproduce the current behavior.
4. Make the smallest useful change that solves the issue.
5. Run `npm run check` before opening the PR.

## Coding conventions

- Prefer simple, explicit code over abstraction-heavy patterns.
- Keep the core workflow client-side. Do not introduce backend requirements unless the change is explicitly discussed first.
- Put editor UI in `components/pdf-editor/`.
- Put state transitions in `hooks/use-pdf-state.ts`.
- Put PDF processing and browser-PDF integration in `lib/`.
- Put shared editor contracts in `types/`.
- Add comments only when the code would otherwise be hard to follow.
- Preserve TypeScript types and avoid `any` unless there is a clear practical reason.
- If touching a high-risk file, prefer extraction of small helpers over broad rewrites.

## Files that are easiest to change first

- `components/pdf-editor/top-bar.tsx`
- `components/pdf-editor/right-panel.tsx`
- `lib/i18n.ts`
- documentation under `docs/`
- tests under `hooks/` and `lib/`

## Files that need extra care

- `components/pdf-editor/center-canvas.tsx`
- `hooks/use-pdf-state.ts`
- `lib/pdf-export.ts`

## Commit hygiene

- Use clear, descriptive commit messages.
- Keep refactors separate from behavior changes when practical.
- Avoid mixing formatting-only changes with product logic changes.
- Rebase or squash noisy fixup commits before merge if needed.

Examples:

- `Add keyboard shortcuts help modal`
- `Improve invalid PDF error messages`
- `Extract PDF state serialization helpers`

## Reporting bugs

Use the bug report template and include:

- expected behavior
- actual behavior
- reproduction steps
- browser and OS
- sample PDF details when relevant
- screenshots or recordings when helpful

## Suggesting features

Use the feature request template and describe:

- the workflow problem
- who benefits
- why the feature belongs in a lightweight local-first app
- the simplest acceptable version of the idea

## Contributions that are especially welcome

- PDF workflow improvements
- annotation UX
- accessibility improvements
- performance work for larger files
- mobile and touch support
- tests around state and export behavior
- docs and onboarding improvements

## What usually gets delayed or pushed back

- backend features that break the no-upload model
- large UI rewrites without a workflow problem attached
- broad refactors without tests or incremental steps
- features that add complexity without improving the core PDF workflow

## Pull request checklist

- Run `npm run check`
- Add tests if behavior changed
- Update docs if contributor-facing behavior changed
- Keep the scope reviewable
- Fill out the PR template

## Questions

If the right home for a change is unclear, open an issue before implementing it.
