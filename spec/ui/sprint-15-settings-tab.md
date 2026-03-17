# Sprint 15 — Settings Tab

Status: Implemented

## Goal

Replace the Settings placeholder in the bottom drawer with a real settings panel: PVM selection, stepping mode, and host-call auto-continue policy. Settings persist to localStorage independently of any loaded program.

## What Works After This Sprint

- Settings tab shows three labeled sections with explanatory text
- PVM selection toggles (Typeberry, Ananas), last PVM cannot be disabled
- Stepping mode: Instruction, Block, N-Instructions (with count input)
- Host call auto-continue: Always, When Trace Matches, Never (Manual)
- All settings persist across page reloads
- Changing PVM set reloads the current program from its initial state

## Prior Sprint Dependencies

- Sprint 14: drawer shell with Settings tab slot

## Required Files

```
apps/web/src/components/drawer/SettingsTab.tsx
apps/web/src/components/drawer/PvmSelectionConfig.tsx
apps/web/src/components/drawer/SteppingModeConfig.tsx
apps/web/src/components/drawer/AutoContinueConfig.tsx
apps/web/src/context/debugger-settings.tsx
apps/web/src/hooks/useDebuggerSettings.ts
apps/web/src/lib/debugger-settings.ts
apps/web/e2e/sprint-15-settings.spec.ts
```

## Persistence Contract

Persisted values:

- selected PVM ids
- stepping mode
- N-instructions count
- auto-continue policy

Rules:

- load on first render
- keep compatibility with legacy `pvmdbg.settings` aggregate blob
- also mirror per-setting storage keys for future reuse
- changes visible immediately without refresh

## PVM Selection Contract

- toggles for `Typeberry` and `Ananas`
- the last remaining enabled PVM cannot be disabled
- changing the PVM set reloads the current program from its initial state
- show a warning alert that PVM changes reset the debugger

Implementation pitfall: replacing the orchestrator creates a brief no-program window. The debugger route must not redirect to `/load` during this transition.

## Stepping Mode Contract

- `Instruction`, `Block`, and `N-Instructions` options
- N-Instructions includes a numeric input for the count
- the stored count survives page reloads

The `Step` button that uses this setting comes in Sprint 16.

## Host Call Policy Contract

- `Always`, `When Trace Matches`, `Never (Manual)`
- descriptive help text for the current selection
- no trace-loading UI in Settings

## Layout Contract

Three labeled sections:

- `PVM Selection`
- `Stepping Mode`
- `Host Call Policy`

Every section includes concise explanatory copy. Every option has a smaller hint line.

## E2E Tests

```
- the three settings groups render
- disabling the last PVM is prevented
- stepping mode persists across page reload
- auto-continue policy persists across page reload
- changing N-instructions count updates the stored value
- descriptive hint text is visible
```

## Acceptance Criteria

- Settings tab renders three groups with working controls.
- Last PVM cannot be disabled.
- PVM change reloads the program.
- All settings persist across page reloads.
- Every option has explanatory text.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-15-settings.spec.ts
```
