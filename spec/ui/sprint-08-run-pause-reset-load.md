# Sprint 08 — Run / Pause / Reset / Load Controls

Status: Implemented

## Goal

Complete the basic execution control toolbar: continuous run with pause, reset to initial state, and a load button that tears down the orchestrator and returns to the loader. After this sprint the full execution lifecycle works end-to-end.

## What Works After This Sprint

- Toolbar shows: `Load | Reset | separator | Next | separator | Run/Pause`
- `Run` starts continuous execution, becomes `Pause`
- `Pause` stops the run loop
- `Reset` restores the machine to initial loaded state
- `Load` tears down the orchestrator and navigates to `/load`
- Terminal programs show `Execution Complete` and disable Next/Run
- Errors surface a destructive alert

## Prior Sprint Dependencies

- Sprint 05: Next button, `useDebuggerActions`

## Required Files

```
apps/web/src/components/debugger/ExecutionControls.tsx  (extend)
apps/web/src/hooks/useDebuggerActions.ts                (extend)
apps/web/e2e/sprint-08-execution-controls.spec.ts
```

## Toolbar Contract

The toolbar places controls in this order:

- `Load`
- `Reset`
- separator
- `Next`
- separator
- `Run` / `Pause` (same slot, mutually exclusive)

The `Step` button (configured stepping mode) comes in Sprint 16. For now, only `Next` is available for manual stepping.

Rules:

- every toolbar button must have a visible text label (not icon-only) and an `aria-label` describing its action
- `Run` and `Pause` replace each other in the same position
- all buttons use `cursor: pointer`
- disabled buttons are visibly dimmed
- tooltips include the action name and shortcut where applicable

## Action Contract

Extend `useDebuggerActions` with:

- `run()` — continuous step loop with stop flag, yields to React between iterations
- `pause()` — sets the stop flag
- `reset()` — calls `orchestrator.reset()`
- `load()` — navigates to `/load` and calls `teardown()`

## Run Loop Contract

Run mode performs repeated step batches and yields control back to React between iterations.

Rules:

- stop when the pause flag is set
- stop when all active PVMs are terminal
- keep the `Pause` button visible for the duration of the run
- switching to Pause must be responsive enough for E2E interaction

## Completion / Error Contract

- `Execution Complete` badge when all active PVMs are terminal
- destructive alert when an action fails
- `Reset` and `Load` stay available after completion
- `Next` and `Run` are disabled after completion

## E2E Tests

```
- toolbar renders Load, Reset, Next, Run in the correct order
- Run starts continuous execution and becomes Pause
- Pause stops execution
- Reset returns PC, gas, and registers to initial values
- Load navigates back to /load
- running a small program to completion shows terminal status and disables Next/Run
- Reset and Load remain enabled after completion
```

## Acceptance Criteria

- The toolbar renders `Load | Reset | Next | Run/Pause`.
- `Run` starts a continuous loop; `Pause` stops it.
- `Reset` restores the initial loaded state.
- `Load` tears down the orchestrator and returns to `/load`.
- Terminal programs disable execution buttons but keep Reset and Load.
- Errors surface as destructive alerts.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-08-execution-controls.spec.ts
```
