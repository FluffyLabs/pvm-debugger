# Sprint 24 — Multi-PVM Tabs

## Goal

Add PVM tabs to the right side of the debugger toolbar. When multiple PVMs are active (e.g., Typeberry and Ananas), each gets its own tab with a status dot. Clicking a tab switches the selected PVM across all debugger panels.

## What Works After This Sprint

- One tab renders per active PVM in the toolbar
- Each tab shows a compact lifecycle status dot
- Clicking a tab switches the selected PVM globally
- All panels (instructions, registers, memory, drawer tabs) update to show the selected PVM's state
- Removed PVMs disappear from the tab bar

## Prior Sprint Dependencies

- Sprint 04: reactive state hook with `selectedPvmId`
- Sprint 07: debugger layout toolbar
- Sprint 15: PVM selection in settings (enables multiple PVMs)

## Required Files

```
apps/web/src/components/debugger/PvmTabs.tsx
apps/web/e2e/sprint-24-pvm-tabs.spec.ts
```

## Selection Contract

Rules:

- render one tab for every active PVM in the orchestrator
- tabs use the shared reactive `selectedPvmId`, not per-panel local state
- clicking a tab updates the selected PVM for every debugger panel
- removed PVMs disappear immediately from the tab bar

Implementation pitfall: the app needs a single shared reactive state provider. If each panel subscribes independently, tab switching drifts out of sync.

## Status Dot Contract

Each tab shows a compact status dot with lifecycle-based color:

- OK / paused → blue
- running → green
- host call pause → amber
- halt / completed → gray
- failed / timed out → red

Rules:

- keep tabs compact
- do not expose raw lifecycle strings in the tab label

## E2E Tests

Enable both Typeberry and Ananas in Settings before testing.

```
- both PVM tabs render when both are enabled
- clicking a tab changes the rendered register values
- status dots reflect PVM lifecycle
- single-PVM mode shows one tab
```

## Acceptance Criteria

- One tab per active PVM renders in the toolbar.
- Clicking a tab switches the selected PVM globally.
- All panels update to reflect the selected PVM.
- Status dots use lifecycle-appropriate colors.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-24-pvm-tabs.spec.ts
```
