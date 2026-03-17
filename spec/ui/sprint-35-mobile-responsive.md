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

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-35-responsive.spec.ts
```
