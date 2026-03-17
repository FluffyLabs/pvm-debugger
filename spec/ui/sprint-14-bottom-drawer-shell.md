# Sprint 14 — Bottom Drawer Shell

Status: Implemented

## Goal

Add the bottom drawer to the debugger layout. The drawer is always visible as a tab bar at the bottom, expandable to show tab content. This sprint builds only the shell — tab bodies are placeholders. Content comes in Sprints 15, 19–23.

## What Works After This Sprint

- Bottom drawer tab bar is always visible below the panel area
- Four tabs: Settings, Ecalli Trace, Host Call, Logs
- Clicking a tab opens the drawer to show that tab's placeholder content
- Clicking the active tab collapses the drawer
- Drawer height is resizable by dragging the top handle
- Minimum height clamps to collapsed (tab-bar only)
- Maximum height clamps to 60% of viewport

## Prior Sprint Dependencies

- Sprint 07: debugger layout (3-column grid)

## Required Files

```
apps/web/src/components/debugger/BottomDrawer.tsx
apps/web/src/components/debugger/DrawerContext.tsx
apps/web/src/styles/debugger-layout.css          (extend)
apps/web/e2e/sprint-14-drawer.spec.ts
```

## Layout Integration Contract

The drawer is added as a third row to the debugger grid:

1. toolbar row
2. main 3-column area
3. drawer row

The drawer is an in-page split pane, not a modal overlay.

## Drawer State Contract

`DrawerContext` exposes:

```ts
type DrawerTab = "settings" | "ecalli_trace" | "host_call" | "logs";

interface DrawerState {
  activeTab: DrawerTab | null;
  height: number;
  setActiveTab: (tab: DrawerTab | null) => void;
  setHeight: (height: number) => void;
  openToTab: (tab: DrawerTab) => void;
}
```

Rules:

- `activeTab === null` means collapsed
- collapsed height is tab-bar only
- opening a tab restores the last expanded height or a sensible default (~200px)
- `openToTab()` is for programmatic use (e.g., auto-opening on host call pause)

## Drawer Behavior Contract

- the tab bar is always visible
- each tab must have a visible text label (not icon-only) and an `aria-label`
- drag handle at the top edge
- clicking a non-active tab opens it
- clicking the active tab collapses the drawer
- minimum height clamps to collapsed state
- maximum height clamps to 60% of viewport
- use pointer events for drag-resize

## Placeholder Tab Bodies

Each tab renders placeholder text:

- "Settings — coming soon"
- "Ecalli Trace — coming soon"
- "Host Call — coming soon"
- "Logs — coming soon"

## E2E Tests

```
- drawer tab bar is visible on the debugger page
- clicking a tab expands the drawer
- clicking the active tab collapses the drawer
- dragging the resize handle changes drawer height
- all four tab labels are visible
```

## Acceptance Criteria

- The bottom drawer tab bar is always visible.
- Clicking tabs expands/collapses the drawer.
- Drag resize works within min/max bounds.
- Four placeholder tabs are present.
- The drawer integrates into the debugger layout grid.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-14-drawer.spec.ts
```
