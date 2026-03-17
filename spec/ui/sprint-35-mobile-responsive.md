# Sprint 35 — Mobile / Responsive Layout

Status: Implemented

## Goal

Add responsive behavior to the debugger and load pages. Below 768px, the 3-column debugger layout collapses to a single-panel view with a panel switcher, and the load wizard columns stack vertically.

## What Works After This Sprint

- Below 768px, the debugger shows one panel at a time with a tab switcher (Instructions / Registers / Memory)
- The bottom drawer remains visible beneath the active panel
- The load wizard columns stack vertically on narrow screens
- Mobile sidebar collapses to a single content column when hidden
- All functionality remains accessible on narrow viewports

## Prior Sprint Dependencies

- Sprint 07: 3-column debugger layout
- Sprint 10: two-column load page layout

## Required Files

```
apps/web/src/styles/debugger-layout.css   (extend with responsive rules)
apps/web/src/styles/layout.css            (extend)
apps/web/e2e/sprint-35-responsive.spec.ts
```

## Debugger Responsive Contract

Below 768px:

- stack the main area vertically
- expose a panel switcher for: Instructions, Registers, Memory
- only the selected panel is visible
- the bottom drawer remains beneath the active panel
- the toolbar row remains visible

## Load Page Responsive Contract

Below 768px:

- source inputs and example browser stack vertically
- all content remains accessible

## Shell Responsive Contract

- mobile collapses to a single content column when the sidebar is hidden
- header stays at the top

## E2E Tests

Use narrow viewport (e.g., 375px width):

```
- debugger shows panel switcher on narrow viewport
- switching panels shows the correct content
- bottom drawer is visible below the panel
- load page columns stack vertically on narrow viewport
```

## Acceptance Criteria

- The debugger collapses to a single-panel view below 768px.
- A panel switcher allows navigating between panels.
- The drawer remains accessible on mobile.
- The load page stacks vertically on narrow screens.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

### Implementation Notes & Edge Cases

- **Panel switcher hidden on desktop**: The switcher bar renders in the DOM always but is `display: none` above 768px. Tests verify it is not visible on wide viewports.
- **Panel state preserved**: All three panel React trees stay mounted (CSS `display: none`), so scroll position and component state are preserved when switching panels on mobile. Do NOT switch to conditional rendering — that would lose state.
- **Resize recovery**: Resizing from narrow back to wide viewport restores the 3-column grid because `data-mobile-visible` attributes only apply within the media query. No JS cleanup needed.
- **Sidebar hiding**: Uses `.app-body > aside` selector, which depends on `AppsSidebar` rendering an `<aside>` element. If shared-ui changes that, the selector will break.
- **Toolbar wrapping**: On mobile the toolbar gets `flex-wrap: wrap` to prevent overflow, since execution controls + PVM tabs don't fit in 375px on one line.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-35-responsive.spec.ts
```
