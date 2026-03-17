# Sprint 30 — Registers — Change Highlighting + Pending Changes

Status: Implemented

## Goal

Add visual feedback for state changes on the registers panel: delta markers on changed registers, a brief flash animation, and a pending-changes preview when a host call is paused with a resume proposal.

## What Works After This Sprint

- Changed registers show a `Δ` marker until the next state update
- Changed register rows get a short flash/fade animation
- PC and gas fields show a lighter changed-border state
- Comparison is against the previous snapshot, not initial load
- Comparison resets when the selected PVM changes
- Pending host-call proposals show a unified preview of register writes, gas change, and memory writes (truncated)

## Prior Sprint Dependencies

- Sprint 04: registers panel
- Sprint 29: inline editing (register row structure)
- Sprint 18: host-call resume flow (for pending proposals)

## Required Files

```
apps/web/src/components/debugger/PendingChanges.tsx
apps/web/src/components/debugger/RegistersPanel.tsx   (extend)
apps/web/src/components/debugger/RegisterRow.tsx       (extend)
apps/web/e2e/sprint-30-change-highlighting.spec.ts
```

## Change Highlighting Contract

Rules:

- when the selected PVM state changes after stepping or editing, compare against the previous snapshot
- changed registers show a persistent `Δ` marker until the next state update
- changed rows also get a short flash/fade CSS treatment
- PC and gas fields may use a lighter changed-border state
- reset comparison state when the selected PVM changes

## Pending Changes Contract

When a host call is paused and a `resumeProposal` is available, show a unified preview:

- register writes
- gas change
- memory writes with truncated byte preview

Rules:

- prefer the selected PVM's pending host-call info, fall back to the first available
- debounce visibility so short auto-continue pauses do not flash the panel
- render memory previews compactly, not full dumps

## Multi-PVM Register Difference

If the selected PVM's register value differs from another loaded PVM:

- render a small warning indicator on that register row
- clicking the indicator opens a compact explanation popover with the differing PVM id and value

Rules:

- edits still apply uniformly to all PVMs even if divergence is present

## E2E Tests

```
- stepping marks changed registers with Δ
- changed registers flash briefly
- Δ markers clear on the next step
- pending host-call changes render during a paused host call
- multi-PVM register divergence shows a warning indicator
```

## Acceptance Criteria

- Changed registers show `Δ` markers and flash animation.
- PC/gas show changed-border state.
- Comparison is against previous snapshot, not initial load.
- Pending host-call proposals show a unified preview.
- Multi-PVM divergence shows a warning popover.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-30-change-highlighting.spec.ts
```
