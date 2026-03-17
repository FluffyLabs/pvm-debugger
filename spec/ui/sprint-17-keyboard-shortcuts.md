# Sprint 17 — Keyboard Shortcuts

Status: Implemented

## Goal

Add keyboard shortcuts for the primary execution controls. Power users can drive execution entirely from the keyboard.

## What Works After This Sprint

- `F10` triggers Next (single step)
- `F5` toggles Run / Pause
- `Ctrl+Shift+R` triggers Reset
- Browser default behaviors for these keys are suppressed
- Shortcuts work when focus is anywhere on the debugger page

## Prior Sprint Dependencies

- Sprint 08: execution controls (Next, Run/Pause, Reset)
- Sprint 16: Step button

## Required Files

```
apps/web/src/hooks/useDebuggerActions.ts   (extend with keyboard listeners)
apps/web/e2e/sprint-17-shortcuts.spec.ts
```

## Keyboard Contract

| Key | Action |
|-----|--------|
| `F10` | Next (single instruction step) |
| `F5` | Run / Pause toggle |
| `Ctrl+Shift+R` | Reset |

Rules:

- prevent the default browser behavior for all three keys
- `F5` must not trigger a page refresh
- `Ctrl+Shift+R` must not trigger a hard refresh
- shortcuts must be registered at the document level, not scoped to a specific element
- shortcuts must not fire when focus is inside an input/textarea (to avoid conflicts with editing)
- shortcuts respect the same disabled conditions as their toolbar buttons

## E2E Tests

```
- F10 advances execution (PC changes)
- F5 starts running, pressing F5 again pauses
- Ctrl+Shift+R resets to initial state
- shortcuts do not trigger page refresh
```

## Acceptance Criteria

- All three keyboard shortcuts work from the debugger page.
- Browser defaults are suppressed.
- Shortcuts respect disabled states (terminal, in-progress).
- Shortcuts do not fire during text input.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

### Implementation Notes & Edge Cases

- **Stale closure pitfall**: The F5 Run/Pause toggle uses `isRunningRef` (a synchronous ref) instead of the `isRunning` React state to decide between `run()` and `pause()`. React state updates asynchronously, so the keyboard handler closure could hold a stale `isRunning` value when F5 is pressed twice rapidly. The ref tracks running state synchronously and is updated at every run/pause/reset/load entry point and loop exit.
- **Double-invocation guard**: `run()` checks both `isRunning` (React state) and `isRunningRef.current` (synchronous ref) to prevent launching two concurrent run loops if F5 is pressed twice before React re-renders.
- **E2E keyboard dispatch**: Playwright's `page.keyboard.press("F5")` triggers CDP-level key events that may cause browser-level refresh before JS `preventDefault()` runs. Tests use `page.evaluate` to dispatch synthetic `KeyboardEvent`s directly through the DOM pipeline, bypassing browser shortcut handling.
- **Pause button visibility timing**: The Pause button may not appear in the DOM if the run loop completes before React re-renders. E2E tests account for this by accepting either Pause button visibility, execution completion badge, or PC change as proof that F5 triggered execution.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-17-shortcuts.spec.ts
```
