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

## Implementation Notes

Key decisions and gotchas discovered during implementation:

- **Layout changed from grid to flexbox**: `.debugger-shell` switched from `display: grid` to `display: flex; flex-direction: column` so the drawer's dynamic height (explicit px via style attribute) cooperates naturally with the panels area (`flex: 1`). The panel grid is unchanged inside its flex child.
- **Drag uses pointer capture**: `setPointerCapture` on the drag handle element ensures reliable tracking even if the pointer moves outside the handle during fast drags. All pointer events (`onPointerDown/Move/Up/Cancel`) are on the handle itself — no document-level listeners.
- **`DrawerProvider` wraps `DebuggerPage`**: This placement allows future sprints (e.g., host call auto-open) to call `openToTab("host_call")` from any component inside the debugger.
- **Replacing placeholder content**: Each tab body is a simple `<p>` inside the `drawer-content` div in `BottomDrawer.tsx`. Future sprints (15, 19–23) should replace the relevant `{activeTab === "..." && <p>...</p>}` line with the real component.
- **Tab bar is always at the bottom**: The tab bar renders below content (visually anchored to page bottom). The drag handle and content area only render when expanded (`activeTab !== null`).
- **Height state lives in context, clamp is at drag time**: `setHeight` stores raw px. The 60% max is enforced in `onPointerMove` using `window.innerHeight`. On window resize, existing height is not re-clamped (self-corrects on next drag or collapse/expand cycle).
