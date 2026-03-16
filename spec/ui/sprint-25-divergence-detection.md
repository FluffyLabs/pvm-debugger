# Sprint 25 — Divergence Detection

## Goal

When multiple PVMs are active, detect and surface divergences between them. Show a concise inline summary next to the tab strip and detailed per-field information in a tooltip. Also surface failed/timed-out PVM errors inline.

## What Works After This Sprint

- Divergence summary appears when PVMs disagree on PC, status, gas, or registers
- Summary text is concise: e.g., `PC, Gas, 2 registers`
- Tooltip shows full per-field details
- No divergence output when fewer than 2 PVMs are active
- Failed/timed-out PVMs show inline red error text
- Divergence clears after reset

## Prior Sprint Dependencies

- Sprint 24: multi-PVM tabs

## Required Files

```
apps/web/src/hooks/useDivergenceCheck.ts
apps/web/src/components/debugger/PvmTabs.tsx    (extend with divergence display)
apps/web/e2e/sprint-25-divergence.spec.ts
```

## Divergence Contract

`useDivergenceCheck` compares the selected PVM against other active PVMs.

Required comparisons:

- PC
- status / lifecycle
- gas
- any differing registers

Rules:

- no output when fewer than 2 PVMs are active
- concise inline text: `PC (...)` or `PC, Gas, 2 registers`
- full per-field details in a tooltip
- use `PC`, not `Pc`, in user-facing text

## Error Visibility Contract

Failed / timed-out PVMs must be visible without opening a drawer.

Rules:

- display inline red text next to the tab strip
- show `Timeout` for timeouts
- show `Error: ...` for failures
- lifecycle tracking must update from orchestrator `error` events (these do not emit `pvmStateChanged`)

## Reactive State Contract

The reactive state layer must additionally support:

- per-PVM errors
- failed/timed-out lifecycle updates from `error` events

Implementation pitfall: failed/timed-out sessions do not emit `pvmStateChanged`; the UI must capture lifecycle from the error event itself.

## E2E Tests

```
- divergence appears when PVMs disagree after stepping
- divergence text is concise and tooltip shows details
- divergence clears after reset
- error text appears inline for failed PVMs
- no divergence shown with single PVM
```

## Acceptance Criteria

- Divergence appears only when 2+ PVMs disagree.
- Summary is concise; tooltip has full details.
- Failed/timed-out PVMs show inline error text.
- Divergence clears after reset.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-25-divergence.spec.ts
```
