# UI-004 - Debugger Layout

## Purpose

Implement the debugger page shell as a fixed desktop-first workspace:

- a top toolbar row
- a 3-column main panel area
- a resizable bottom drawer

This ticket defines the structural container for all later debugger UI tickets. The layout must be real, not a placeholder card.

## Required Files

```
apps/web/src/pages/DebuggerPage.tsx
apps/web/src/components/debugger/DebuggerLayout.tsx
apps/web/src/components/debugger/BottomDrawer.tsx
apps/web/src/components/debugger/DrawerContext.tsx
apps/web/src/styles/debugger-layout.css
apps/web/e2e/debugger-layout.spec.ts
```

## Route Contract

`DebuggerPage` must:

- redirect to `/load` when no program is loaded
- render the debugger shell when an orchestrator program is present
- preserve the `pvm-status-*` test ids introduced by the load flow so post-load checks still work

## Layout Contract

### Desktop

Use a fixed 3-column grid for the main area:

- Instructions: `3fr`
- Registers + Status: `3.5fr`
- Memory: `3.5fr`

The full page uses grid rows:

1. toolbar row
2. main 3-column area
3. drawer row

Rules:

- the page itself must not become the scrolling container
- each panel body scrolls independently
- panel headers align to the same height
- use subtle separators instead of heavy boxes

### Mobile / Narrow Screens

Below `768px`, stack the main area vertically and expose a simple panel switcher for:

- Instructions
- Registers
- Memory

The bottom drawer remains visible beneath the active panel.

## Toolbar Contract

The top row is still placeholder content at this stage, but it must reserve the real structural slots for later tickets:

- PVM tabs / selected PVM summary
- divergence indicators
- execution controls

Loaded PVM statuses must remain visible in this row so the route still shows `OK` immediately after a successful program load.

## Drawer State Contract

The drawer state lives in `DrawerContext` and is reusable by future tickets.

Required state:

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
- collapsed height is tab-bar-only
- opening a tab restores the last expanded height or a sensible default
- `hostCallPaused` state from the orchestrator auto-opens the drawer to `host_call`

## Bottom Drawer Contract

The drawer is an in-page split pane, not a modal overlay.

Requirements:

- visible at all times
- drag handle at the top
- clickable tab bar
- clicking a non-active tab opens it
- clicking the active tab collapses the drawer
- minimum height clamps to collapsed state
- maximum height clamps to `60%` of the viewport

Use pointer events for drag-resize.

For this ticket, each tab body may remain placeholder text:

- Settings placeholder
- Ecalli Trace placeholder
- Host Call placeholder
- Logs placeholder

## Browser Behavior Notes

The drawer implementation must remain independent from the later tab content. Do not hard-wire Settings / Logs / Host Call logic into the layout container beyond the tab identifiers and placeholder bodies.

## Testing Requirements

E2E coverage must prove:

- a loaded program renders the debugger shell
- the three panel slots are visible
- the drawer tab bar is always visible
- clicking a drawer tab expands it
- clicking the active tab again collapses it
- dragging the resize handle changes the drawer height
- navigating to `/` without a loaded program redirects to `/load`

## Acceptance Criteria

- The debugger route renders a real 3-column shell after program load.
- The toolbar row, panel area, and drawer all fill the available viewport.
- The bottom drawer tab bar is always visible.
- Drawer expansion and collapse work by clicking tabs.
- Drawer height resizes through pointer dragging.
- Drawer height is clamped to collapsed minimum and `60%` viewport maximum.
- Mobile view falls back to a single active panel with tab navigation.
- The debugger route still exposes loaded PVM `OK` statuses after navigation from the load wizard.
- `/` redirects to `/load` when no program is loaded.
- `cd apps/web && npx vite build` succeeds.
- `npx playwright test e2e/debugger-layout.spec.ts` succeeds.
- `npm run build` succeeds for the workspace.
- `npm test` succeeds for the workspace.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/debugger-layout.spec.ts
npx playwright test e2e/load-wizard-step2.spec.ts
cd ../..
npm run build
npm test
```
