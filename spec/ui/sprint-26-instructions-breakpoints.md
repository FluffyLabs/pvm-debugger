# Sprint 26 — Instructions — Breakpoints

Status: Implemented

## Goal

Add breakpoint support to the instructions panel. Users click the left gutter to toggle breakpoints, which appear as red dots. The orchestrator receives the updated breakpoint list, and `Run` stops when a breakpoint is hit.

## What Works After This Sprint

- Instruction rows have a clickable left gutter
- Clicking the gutter toggles a breakpoint at that PC
- Active breakpoints show a small red dot
- Breakpoint list syncs to `orchestrator.setBreakpoints()`
- Run mode stops when a breakpoint PC is reached
- Breakpoints rehydrate from `orchestrator.getBreakpoints()` when the orchestrator changes

## Prior Sprint Dependencies

- Sprint 03: flat instruction list
- Sprint 08: Run mode

## Required Files

```
apps/web/src/components/debugger/InstructionsPanel.tsx  (extend)
apps/web/src/components/debugger/InstructionRow.tsx
apps/web/e2e/sprint-26-breakpoints.spec.ts
```

## Breakpoint Contract

Rules:

- clicking the left gutter toggles the breakpoint for that instruction's PC
- active breakpoints render as a small red dot in the gutter
- the updated breakpoint list is passed to `orchestrator.setBreakpoints(...)`
- local UI state rehydrates from `orchestrator.getBreakpoints()` when the orchestrator instance changes
- breakpoints survive Reset (same orchestrator instance)

## Run-to-Breakpoint Contract

The existing Run loop (Sprint 08) must respect breakpoints:

- after each step batch, check if the current PC matches a breakpoint
- if it does, stop the run loop
- the PVM should land on the breakpoint PC, not past it

## E2E Tests

```
- clicking the gutter shows a red dot
- clicking again removes the dot
- setting a breakpoint and running stops at that PC
- breakpoints persist after Reset
```

## Acceptance Criteria

- Breakpoint toggling works via gutter clicks.
- Red dots indicate active breakpoints.
- Breakpoints sync to the orchestrator.
- Run stops at breakpoint PCs.
- Breakpoints survive Reset.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-26-breakpoints.spec.ts
```
