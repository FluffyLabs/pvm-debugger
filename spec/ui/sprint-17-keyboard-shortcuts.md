# Sprint 17 — Keyboard Shortcuts

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

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-17-shortcuts.spec.ts
```
