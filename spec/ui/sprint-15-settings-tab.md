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
npm test  # includes debugger-settings.test.ts unit tests
```

## Implementation Notes

### Consuming settings from other components

Use the `useDebuggerSettings()` hook from any component inside `<DebuggerSettingsProvider>` (wraps the entire App). Example for Sprint 16's Step button:

```ts
const { settings } = useDebuggerSettings();
// settings.steppingMode → "instruction" | "block" | "n_instructions"
// settings.nInstructionsCount → number (only meaningful when mode is "n_instructions")
// settings.autoContinuePolicy → "always_continue" | "continue_when_trace_matches" | "never"
```

### PVM reload pitfall

`DebuggerPage.onPvmChange` uses an `isReloadingRef` to suppress the route guard during orchestrator teardown/re-initialization. Without this, the brief `orchestrator === null` window causes a redirect to `/load`. The ref is set before `initialize()` and cleared in the `.finally()` of `loadProgram()`.

### Ananas PVM adapter not yet available

`AVAILABLE_PVMS` lists both Typeberry and Ananas, but `createPvmAdapter("ananas")` in `lib/runtime.ts` throws. Enabling Ananas in settings will crash the PVM reload. This is by design — the adapter will be added in a future sprint. Until then, the toggle exists in the UI but is non-functional for Ananas.

### localStorage key scheme

- Aggregate blob: `pvmdbg.settings` (single JSON object, authoritative source)
- Per-setting mirrors: `pvmdbg.settings.selectedPvmIds`, `pvmdbg.settings.steppingMode`, etc. (for future direct reads without parsing the whole blob)
- `loadSettings()` reads only the aggregate blob; per-setting keys are write-only mirrors for now.

### Sprint-14 test update

The sprint-14 drawer E2E test previously asserted `"Settings — coming soon"`. This was updated to assert `"PVM Selection"` to match the real settings content.
