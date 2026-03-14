# UI-008 - Execution Controls

## Purpose

Implement the debugger toolbar actions that drive execution:

- return to the loader
- reset the loaded program
- step a single instruction
- step using the configured stepping mode
- run continuously
- pause an active run loop

Execution controls are the only way to advance past paused host calls. There is no separate resume button.

## Required Files

```
apps/web/src/components/debugger/ExecutionControls.tsx
apps/web/src/hooks/useDebuggerActions.ts
apps/web/e2e/execution-controls.spec.ts
```

## Toolbar Contract

The top toolbar places execution controls on the left in this exact order:

- `Load`
- `Reset`
- separator
- `Next`
- `Step`
- separator
- `Run` / `Pause` in the same slot

Rules:

- `Next` always steps exactly one instruction
- `Step` uses the configured stepping mode
- `Run` and `Pause` must replace each other in the same position
- all buttons keep `cursor-pointer`
- disabled buttons are visibly dimmed
- tooltips and accessible labels must include the action name and shortcut / behavior text

## Action Contract

`useDebuggerActions` owns all toolbar behavior.

Required actions:

- navigate back to `/load` and tear down the orchestrator
- `orchestrator.reset()`
- single-step via `orchestrator.step(1)`
- configured step via instruction / block placeholder / N-instructions
- continuous run loop with stop flag
- pause an active run loop

Rules:

- manual step actions and run-loop iterations must clear pending host calls before stepping
- when a host call is paused and a trace proposal exists, apply that proposal before stepping
- when a host call is paused without a trace proposal, resuming with empty effects must still unblock stepping
- keyboard shortcuts:
  - `F10` -> `Next`
  - `F5` -> Run / Pause toggle
  - `Ctrl+Shift+R` -> Reset
- prevent default browser refresh behavior for `F5`

## Host Call Resume Contract

The toolbar must seamlessly continue execution from `paused_host_call`.

Rules:

- `Next`, `Step`, and `Run` remain enabled when paused on a host call
- clicking any of them first resumes the host call, then performs the requested step action
- there is no extra resume affordance anywhere else in the toolbar
- auto-continue during run mode depends on the settings policy:
  - `always`
  - `when_trace_matches`
  - `never`

## Stepping Mode Contract

The `Step` button label stays fixed, but its tooltip / accessible label must describe the configured behavior:

- `Instruction` -> `Step 1 instruction`
- `Block` -> `Step to block boundary`
- `N-Instructions` -> `Step N instructions`

Rules:

- ticket `UI-014` replaces the temporary block fallback
- until then, block mode uses a placeholder batch step
- changing the stepping mode must update the Step button label text immediately without reloading the page

## Run Loop Contract

Run mode performs repeated step batches and yields control back to React between iterations.

Rules:

- stop when the pause flag is set
- stop when all active PVMs are terminal
- stop on manual host-call pauses
- keep the Pause button visible for the duration of the active run state
- switching to Pause must be immediate enough for E2E interaction and user feedback

## Completion / Error Contract

The toolbar must expose small execution status affordances:

- `Execution Complete` badge when all active PVMs are terminal
- destructive alert when an action fails

Rules:

- `Reset` and `Load` stay available after completion
- `Next`, `Step`, and `Run` are disabled after completion

## Testing Requirements

E2E coverage must prove:

- buttons render in the required order
- `Next` advances execution
- `Step` reflects the configured stepping mode label
- `Run` becomes `Pause` and can be stopped
- `Reset` returns the machine to its initial state
- `Load` returns to `/load`
- terminal programs disable the execution buttons but keep reset / load enabled
- keyboard shortcuts work
- clicking `Next` while paused on a host call resumes the host call and continues

## Acceptance Criteria

- The left side of the debugger toolbar renders `Load | Reset | Next | Step | Run/Pause`.
- `Next` always performs exactly one instruction step.
- `Step` performs the configured stepping mode and exposes the correct dynamic tooltip / label text.
- `Run` starts a continuous loop and `Pause` stops it.
- `Reset` restores the initial loaded state.
- `Load` tears down the orchestrator and returns to the loader route.
- Host calls resume through the normal execution controls with no separate resume button.
- `F5`, `F10`, and `Ctrl+Shift+R` work and prevent the browser defaults.
- The toolbar shows completion and error state feedback.
- `npm run build -w @pvmdbg/web` succeeds.
- `cd apps/web && npx playwright test e2e/execution-controls.spec.ts` succeeds.

## Verification

```bash
npm run build -w @pvmdbg/web
cd apps/web && npx playwright test e2e/execution-controls.spec.ts
```
