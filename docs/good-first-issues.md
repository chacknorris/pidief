# Good First Issues

These are intentionally scoped for new contributors. Each item should fit in a focused pull request.

## 1. Add a keyboard shortcuts help modal

- Title: `Add a keyboard shortcuts help modal`
- Description: Surface the current editor shortcuts in the UI so users do not have to discover them from documentation or by trial and error.
- Expected result: A small help action in the interface opens a modal listing supported shortcuts and what they do.
- Difficulty: Beginner
- Estimated effort: 2 to 4 hours

## 2. Replace browser prompts with app dialogs

- Title: `Replace alert() and prompt() with UI dialogs`
- Description: The app still uses native browser prompts for file naming and error feedback. Replace them with existing UI primitives for a more polished experience.
- Expected result: Export naming and error feedback happen through in-app dialogs or toasts instead of browser prompts.
- Difficulty: Beginner
- Estimated effort: 3 to 5 hours

## 3. Improve the empty state before any PDF is loaded

- Title: `Improve the pre-import empty state`
- Description: The landing state should explain what PIDIEF does and what the first action should be.
- Expected result: The empty editor state includes a clearer message, a visible call to import a PDF, and a short privacy-first explanation.
- Difficulty: Beginner
- Estimated effort: 1 to 3 hours

## 4. Add loading feedback while thumbnails render

- Title: `Add thumbnail loading placeholders`
- Description: Page thumbnails appear without much transition or loading feedback.
- Expected result: Thumbnail cards show a skeleton or loading state until rendering is complete.
- Difficulty: Beginner
- Estimated effort: 2 to 4 hours

## 5. Add tests for page duplication and deletion edge cases

- Title: `Cover duplicate/delete page edge cases with tests`
- Description: The state hook would benefit from more tests around page operations.
- Expected result: Tests cover duplicating a page, deleting the current page, and preserving selection/current page behavior.
- Difficulty: Beginner
- Estimated effort: 2 to 5 hours

## 6. Improve error messages for invalid PDFs

- Title: `Improve invalid PDF error messages`
- Description: Parsing failures should be more specific and user-friendly.
- Expected result: Better messages for corrupt files, unsupported files, or password-protected PDFs.
- Difficulty: Beginner
- Estimated effort: 2 to 4 hours

## 7. Add clearer drag state styling in the page list

- Title: `Improve page reorder drag feedback`
- Description: The page list supports drag-and-drop, but the drop target can be clearer.
- Expected result: Better visual cues while dragging pages and hovering over drop targets.
- Difficulty: Beginner
- Estimated effort: 2 to 4 hours

## 8. Improve focus states for interactive controls

- Title: `Improve keyboard focus visibility`
- Description: Several controls can be tabbed to, but focus styling can be clearer and more consistent.
- Expected result: Buttons, page items, and editor controls have visible, consistent focus states.
- Difficulty: Beginner
- Estimated effort: 2 to 4 hours

## 9. Add a sample JSON state file for docs and testing

- Title: `Add sample saved-state JSON fixture`
- Description: Contributors would benefit from a concrete example of the serialized document state format.
- Expected result: A documented sample fixture in `docs/` or `tests/fixtures/` plus a short explanation of what it contains.
- Difficulty: Beginner
- Estimated effort: 1 to 3 hours

## 10. Document the “safe places to start” in the codebase

- Title: `Document safe first contribution areas`
- Description: New contributors often need explicit guidance on which files are low-risk and which are central.
- Expected result: A short section in contributor docs describing safe files, medium-risk files, and core engine files.
- Difficulty: Beginner
- Estimated effort: 1 to 2 hours

## 11. Improve mobile spacing in side panels

- Title: `Polish mobile spacing in editor side panels`
- Description: The editor is usable on smaller screens but spacing and control density can be improved.
- Expected result: Better spacing and overflow behavior in panel content on narrow screens.
- Difficulty: Beginner
- Estimated effort: 2 to 4 hours

## 12. Add a demo GIF to the README

- Title: `Add a short demo GIF to the README`
- Description: The project would be easier to understand at a glance with a short recorded workflow.
- Expected result: A lightweight GIF or MP4 preview in `docs/images/` and a README section that references it.
- Difficulty: Beginner
- Estimated effort: 1 to 3 hours
