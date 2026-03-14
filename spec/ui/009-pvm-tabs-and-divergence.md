# UI-009 - PVM Tabs and Divergence Indicators

## Purpose

Implement the right side of the debugger toolbar as the selected-PVM control surface:

- one tab per active PVM
- lifecycle status dot per tab
- inline divergence summary
- inline error / timeout visibility

This tab bar determines which PVM the instructions, registers, memory, and drawer views render.

## Required Files

```
apps/web/src/components/debugger/PvmTabs.tsx
apps/web/src/hooks/useDivergenceCheck.ts
apps/web/e2e/pvm-tabs.spec.ts
```

## Selection Contract

Rules:

- render one tab for every active PVM in the orchestrator
- tabs use the persisted / reactive selected-PVM state, not per-panel local state
- clicking a tab updates the selected PVM for every debugger panel
- removed PVMs disappear immediately from the tab bar

Implementation pitfall:

- the app needs a single shared reactive orchestrator-state provider; if each panel subscribes independently, tab switching drifts out of sync across the layout

## Status Dot Contract

Each tab shows a compact status dot.

Required tones:

- OK / paused -> blue
- running -> green
- host call pause -> amber
- halt / completed -> gray
- failed / timed out -> red

Rules:

- keep the tab compact
- do not expose raw lifecycle strings in the tab label itself

## Divergence Contract

`useDivergenceCheck` compares the selected PVM against the other active PVMs.

Required comparisons:

- PC
- status / lifecycle
- gas
- any differing registers

Rules:

- no divergence output when fewer than two PVMs are active
- summarize concise inline text such as `PC (...)` or `PC, Gas, 2 registers`
- full per-field details belong in the tooltip
- use `PC`, not `Pc`, in user-facing text

## Error Visibility Contract

Failed / timed-out PVMs must be visible without opening a drawer.

Rules:

- display inline red text next to the tab strip
- show `Timeout` for timeouts
- show `Error: ...` for failures
- lifecycle tracking must update from orchestrator `error` events even though those states do not emit `pvmStateChanged`

## Reactive State Contract

The orchestrator-reactive state layer must support:

- selected PVM id
- snapshots with lifecycle
- host-call info
- per-PVM errors
- running-state debouncing
- monotonic revision bumps for dependent views

Implementation pitfall:

- failed / timed-out sessions do not emit `pvmStateChanged`; the UI must update lifecycle state from the error event itself

## Testing Requirements

E2E coverage must prove:

- both tabs render when both PVMs are enabled
- clicking a tab changes the rendered register values
- divergence appears when PVMs disagree
- divergence clears after reset

## Acceptance Criteria

- The right side of the debugger toolbar renders one tab per active PVM.
- Clicking a tab switches the selected PVM across the debugger.
- Each tab shows a live lifecycle status dot.
- Divergence appears only when two or more active PVMs disagree on PC, status, gas, or registers.
- Divergence text is concise and its tooltip exposes the full details.
- Failed and timed-out PVMs expose inline red error text.
- `npm run build -w @pvmdbg/web` succeeds.
- `cd apps/web && npx playwright test e2e/pvm-tabs.spec.ts` succeeds.

## Verification

```bash
npm run build -w @pvmdbg/web
cd apps/web && npx playwright test e2e/pvm-tabs.spec.ts
```
