# Sprint 16 — Stepping Modes (Step Button)

Status: Implemented

## Goal

Add the `Step` button to the toolbar that uses the configured stepping mode from Settings. The button's tooltip dynamically describes the current mode. Block stepping uses a temporary placeholder batch step until Sprint 33 implements real block-aware stepping.

## What Works After This Sprint

- Toolbar order becomes: `Load | Reset | separator | Next | Step | separator | Run/Pause`
- `Step` uses the configured stepping mode
- Tooltip shows: "Step 1 instruction" / "Step to block boundary" / "Step N instructions"
- Changing the stepping mode in Settings updates the Step tooltip immediately
- Block mode uses a temporary batch step fallback

## Prior Sprint Dependencies

- Sprint 08: execution controls (Next, Run, Pause, Reset, Load)
- Sprint 15: settings tab with stepping mode

## Required Files

```
apps/web/src/components/debugger/ExecutionControls.tsx  (extend)
apps/web/src/hooks/useDebuggerActions.ts                (extend)
apps/web/e2e/sprint-16-stepping-modes.spec.ts
```

## Toolbar Contract

Insert `Step` between `Next` and the second separator:

`Load | Reset | separator | Next | Step | separator | Run/Pause`

Rules:

- `Next` always steps exactly one instruction (unchanged)
- `Step` uses the configured stepping mode
- the Step button has a visible text label "Step" (not icon-only) and an `aria-label`
- the tooltip / accessible label describes the current behavior dynamically

## Step Behavior Contract

- `Instruction` → `orchestrator.step(1)` (same as Next)
- `Block` → `orchestrator.step(10)` as a temporary placeholder (Sprint 33 replaces this)
- `N-Instructions` → `orchestrator.step(n)` where `n` is the configured count

Rules:

- the run loop also uses the configured step size per iteration
- changing the mode in Settings must update the tooltip immediately without page reload
- Step is disabled in terminal states and during step execution

## E2E Tests

```
- Step button is visible in the toolbar
- Step button tooltip reflects the configured mode
- changing stepping mode in settings updates the Step tooltip
- Step with N-Instructions mode steps the correct count
- Step button is disabled in terminal state
```

## Acceptance Criteria

- The `Step` button appears in the correct toolbar position.
- Step uses the configured mode from Settings.
- The tooltip dynamically reflects the current mode.
- Block mode uses a temporary batch fallback.
- Mode changes update the tooltip immediately.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Implementation Notes

- `stepsForMode(mode, n)` in `useDebuggerActions.ts` maps stepping mode to step count. Exported for unit testing.
- `stepTooltip(mode, n)` in `debugger-settings.ts` produces the human-readable tooltip string. Computed in `DebuggerPage` and passed as a single `stepTooltip` prop to `ExecutionControls` — the component has no dependency on settings types.
- The `run` loop captures `stepSize` at loop start. Changing stepping mode mid-run has no effect until Pause + Run again. This is intentional.
- Block mode uses `orchestrator.step(10)` as a temporary placeholder. Sprint 33 replaces this with real block-boundary stepping.
- Sprint-08 E2E test `sprint-08-execution-controls.spec.ts` was updated to account for the new Step button at toolbar index 3 (Run moved to index 4).
- Pre-existing issue: Run/Pause E2E tests using `game-of-life` are flaky because the fixture `fixtures/generic/game-of-life.pvm` is only 1 byte, causing instant termination.

## Verification

```bash
cd apps/web && npx vite build
npx vitest run src/lib/debugger-settings.test.ts src/hooks/useDebuggerActions.test.ts
npx playwright test e2e/sprint-16-stepping-modes.spec.ts
```
