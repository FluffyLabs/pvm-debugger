# UI-010 - Bottom Drawer - Settings Tab

## Purpose

Implement the Settings drawer tab as the persistent runtime-configuration surface for:

- active PVM selection
- stepping mode
- host-call auto-continue policy

The same settings must drive both the loader and the debugger toolbar.

## Required Files

```
apps/web/src/components/drawer/SettingsTab.tsx
apps/web/src/components/drawer/PvmSelectionConfig.tsx
apps/web/src/components/drawer/SteppingModeConfig.tsx
apps/web/src/components/drawer/AutoContinueConfig.tsx
apps/web/src/context/debugger-settings.tsx
apps/web/src/hooks/useDebuggerSettings.ts
apps/web/src/lib/debugger-settings.ts
apps/web/e2e/drawer-settings.spec.ts
```

## Persistence Contract

Debugger settings persist independently of any loaded program.

Required persisted values:

- selected PVM ids
- stepping mode
- N-instructions count
- auto-continue policy

Rules:

- load settings on first render
- keep compatibility with the legacy `pvmdbg.settings` aggregate blob
- also mirror the newer per-setting storage keys so later persistence features can reuse them
- changes must be visible immediately without refreshing the page

## Layout Contract

The Settings tab renders three labeled sections:

- `PVM Selection`
- `Stepping Mode`
- `Host Call Policy`

Rules:

- every section includes concise explanatory copy
- every selectable option includes a smaller hint line
- the layout may collapse to one column on narrow widths

## PVM Selection Contract

Rules:

- toggles exist for `Typeberry` and `Ananas`
- the last remaining enabled PVM cannot be disabled
- changing the active PVM set reloads the current program from its initial state
- show a warning alert that PVM changes reset the debugger

Implementation pitfall:

- replacing the orchestrator with a fresh instance creates a brief no-program window; the debugger route must treat interpreter replacement as a tracked transition so it does not redirect to `/load` mid-reload

## Stepping Mode Contract

Rules:

- support `Instruction`, `Block`, and `N-Instructions`
- the N-instructions option includes a numeric input
- updates must immediately change the Step button label text in the execution toolbar
- the stored count must survive page reloads even if the program itself does not yet auto-restore

## Host Call Policy Contract

Rules:

- supported values:
  - `Always`
  - `When Trace Matches`
  - `Never (Manual)`
- expose descriptive help text for the current selection
- the setting only controls auto-continue policy; it must not include trace-loading UI

## Testing Requirements

E2E coverage must prove:

- the three settings groups render
- disabling the last PVM is prevented
- stepping mode persists across page reloads
- auto-continue policy persists across page reloads
- changing the N-instructions count updates the Step button behavior label
- descriptive hint text is visible

## Acceptance Criteria

- The Settings drawer tab renders PVM selection, stepping mode, and host-call policy controls.
- The last remaining PVM cannot be disabled.
- Changing the PVM set reloads the current program instead of bouncing to the loader.
- Stepping mode and auto-continue settings persist across page reloads.
- The N-instructions count updates the Step button’s behavior label immediately.
- Every setting group and option has explanatory hint text.
- No trace-loading UI appears in Settings.
- `npm run build -w @pvmdbg/web` succeeds.
- `cd apps/web && npx playwright test e2e/drawer-settings.spec.ts` succeeds.

## Verification

```bash
npm run build -w @pvmdbg/web
cd apps/web && npx playwright test e2e/drawer-settings.spec.ts
```
