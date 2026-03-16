# Sprint 07 — 3-Column Debugger Layout

## Goal

Arrange the existing debugger panels (instructions, registers, memory) into a real 3-column desktop grid with a toolbar row and independent panel scrolling. This replaces the default stacked layout from earlier sprints with the final debugger workspace structure.

## What Works After This Sprint

- Debugger uses a fixed 3-column grid: Instructions | Registers + Status | Memory
- Each panel scrolls independently
- A toolbar row sits above the panels
- Panel headers align to the same height
- The page itself does not scroll — only panels do

## Prior Sprint Dependencies

- Sprint 03: instructions panel
- Sprint 04: registers panel
- Sprint 05: execution controls (Next button in toolbar)
- Sprint 06: memory panel

## Required Files

```
apps/web/src/components/debugger/DebuggerLayout.tsx
apps/web/src/styles/debugger-layout.css
apps/web/e2e/sprint-07-layout.spec.ts
```

## Layout Contract

### Desktop

Use a fixed 3-column grid for the main area:

- Instructions: `3fr`
- Registers + Status: `3.5fr`
- Memory: `3.5fr`

The full page uses grid rows:

1. toolbar row (execution controls)
2. main 3-column area (fills remaining height)

Rules:

- the page itself must not become the scrolling container
- each panel body scrolls independently
- panel headers align to the same height
- use subtle separators instead of heavy boxes
- the layout must fill the available viewport height

### Implementation Pitfall

If `.debugger-route` / `.debugger-shell` are allowed to grow with content, virtualization (Sprint 27) will see a viewport height equal to the full list height and mount every row. Fix the height chain at the route/layout level, not inside individual panels.

## Toolbar Row Contract

The toolbar row is a structural container for execution controls. In this sprint it contains the `Next` button from Sprint 05. Future sprints add more controls.

Rules:

- the toolbar occupies a fixed-height row above the panel grid
- loaded PVM statuses remain visible in the toolbar area

## E2E Tests

```
- the three panel columns are visible side by side
- each panel scrolls independently (scrolling one does not scroll others)
- the toolbar row is visible above the panels
- PVM status remains visible after layout change
```

## Acceptance Criteria

- The debugger route renders a real 3-column layout after program load.
- Toolbar row, panel area fill the available viewport.
- Each panel scrolls independently.
- Panel headers align at the same height.
- The page itself does not scroll.
- Previous sprint functionality (instructions, registers, memory, Next) still works.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-07-layout.spec.ts
```
