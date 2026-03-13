# Contributor Ideas

This page is the quick index. For structured issue candidates, see:

- [docs/good-first-issues.md](good-first-issues.md)
- [docs/medium-issues.md](medium-issues.md)
- [docs/community.md](community.md)

## Safe places to start

If you are new to the codebase, these areas are the safest entry points:

- `components/pdf-editor/right-panel.tsx` for control labels and property UI
- `components/pdf-editor/top-bar.tsx` for import/export affordances
- `lib/i18n.ts` for copy improvements
- docs and issue templates under `docs/` and `.github/`
- tests in `hooks/use-pdf-state.test.ts` and `lib/pdf-export.test.ts`

## Higher-risk areas

These files are central to the editor and benefit from smaller, well-tested PRs:

- `components/pdf-editor/center-canvas.tsx`
- `hooks/use-pdf-state.ts`
- `lib/pdf-export.ts`

## Good contribution themes

- onboarding and documentation clarity
- accessibility improvements
- keyboard support
- touch and mobile UX
- better error states
- test coverage around PDF state and export
- performance improvements for larger files
