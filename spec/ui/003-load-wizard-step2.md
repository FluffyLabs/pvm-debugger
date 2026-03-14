# UI-003 - Load Wizard Step 2

## Purpose

Implement the second load-wizard step as the real preflight screen before entering the debugger.

Step 2 must:

- summarize the detected source with format-specific details
- expose SPI entrypoint configuration when the source is a JAM SPI payload
- handle invalid decodes with a generic-program fallback
- initialize the web debugger runtime and navigate into `/`

## Required Files

```
apps/web/src/pages/LoadPage.tsx
apps/web/src/components/load/ConfigStep.tsx
apps/web/src/components/load/DetectionSummary.tsx
apps/web/src/components/load/SpiEntrypointConfig.tsx
apps/web/src/context/orchestrator.tsx
apps/web/src/lib/runtime.ts
apps/web/src/workers/typeberry.worker.ts
apps/web/e2e/load-wizard-step2.spec.ts
```

## Wizard Contract

`LoadPage` keeps ownership of:

- `step`
- `rawPayload`
- `detectedFormat`
- `exampleEntry`

Rules:

- step 2 must receive the real payload selected in step 1
- `Back` returns to step 1 without losing the selected candidate
- step 1 must rehydrate its candidate summary from the stored payload when the user returns
- step 2 is responsible for the final `Load Program` action

## Detection Summary Contract

Render one compact summary card that always includes:

- detected format label
- source identifier or test name
- format-specific details

Required branches:

### JAM SPI with metadata

Show:

- metadata text decoded from the embedded blob
- binary size
- decoded code size
- jump-table entry count
- memory segment count with readable/writable split and total bytes
- initial PC and gas
- initial register preview from the decoded startup state

### JAM SPI without metadata

Show the same structural data except metadata text.

### Trace files

Show:

- trace host-call entry count
- extracted program kind
- extracted code size for SPI traces or raw program size for generic traces
- initial PC and gas from the trace prelude
- initial register preview

Trace sources must not render SPI entrypoint controls or gas inputs.

### JSON PVM test vectors

Show:

- test name
- program size
- initial PC and gas
- register count and non-zero register count
- expected terminal status

### Generic PVM blobs

Show:

- program size
- initial state summary using the actual envelope values
- initial register preview

### Invalid decodes

When envelope construction fails:

- show a destructive alert with the decode error
- keep the user on step 2
- offer `Try as Generic PVM` unless the source is already forced generic

The generic fallback must reinterpret the same raw bytes through `decodeGenericProgram()`.

## SPI Entrypoint Contract

Only show SPI entrypoint config for:

- `jam_spi`
- `jam_spi_with_metadata`

Requirements:

- builder mode and RAW mode must both target the same selected entrypoint
- builder fields must encode through `encodeSpiEntrypoint()`
- RAW edits must decode back into builder fields for the current entrypoint shape
- invalid numeric or hex input must surface a destructive error and disable `Load Program`
- example manifest entrypoints override persisted defaults on initial load
- persisted localStorage values survive page reloads and later wizard visits

Required builder variants:

1. `Refine`
2. `Accumulate`
3. `Is Authorized`

The default builder state should match the current manifest presets:

- `Accumulate`
- slot `42`
- id `0`
- results `0`

## Runtime Initialization Contract

`Load Program` must:

1. build a `ProgramEnvelope`
2. initialize the orchestrator with the selected PVM set from localStorage settings, defaulting to `typeberry` and `ananas`
3. call `orchestrator.loadProgram(envelope)`
4. apply `orchestrator.setTrace()` for every loaded PVM when the envelope contains a trace
5. navigate to `/`

The debugger landing screen must expose each loaded PVM status and show `OK` immediately after load.

## Browser Runtime Notes

For the current rewrite:

- Typeberry runs through the browser worker bridge
- Ananas currently loads through a browser `DirectAdapter` fallback

This fallback is required because the browser worker path for Ananas deadlocks on `load()` in the current environment even though the interpreter works correctly on the browser main thread. Keep the adapter factory isolated so the worker path can be restored later without changing the wizard contract.

## No Gas Editing

Step 2 must not expose gas editing for any source type.

Gas comes from:

- SPI defaults
- trace prelude
- JSON vector data
- generic defaults or manifest overrides

Gas editing belongs to the debugger screen, not the loader.

## Testing Requirements

E2E coverage must prove:

- SPI metadata summaries render real decoded details
- all three SPI entrypoint options are selectable
- builder and RAW mode remain synchronized
- example entrypoints prefill the builder
- trace sources suppress SPI config
- JSON vectors show expected-status data
- invalid trace-like payloads surface the generic fallback
- `Load Program` navigates to `/` and shows `OK` statuses
- `Back` returns to step 1 with the candidate preserved

## Acceptance Criteria

- Detection summary renders correct format-specific data for SPI, trace, JSON-vector, and generic sources.
- Invalid decode errors surface clearly and support generic fallback.
- SPI entrypoint config renders only for SPI formats.
- Builder and RAW mode stay synchronized in both directions.
- Example manifest entrypoints prefill the SPI builder.
- SPI config persists to localStorage.
- Step 2 exposes no gas editor.
- Trace files skip SPI entrypoint configuration.
- `Load Program` initializes the orchestrator, loads the envelope, attaches traces, and navigates to the debugger.
- The debugger placeholder route shows `OK` for loaded PVM sessions.
- Back-navigation preserves the candidate chosen in step 1.
- `cd apps/web && npx vite build` succeeds.
- `npx playwright test e2e/load-wizard-step2.spec.ts` succeeds.
- `npm run build` succeeds for the workspace.
- `npm test` succeeds for the workspace.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/load-wizard-step2.spec.ts
cd ../..
npm run build
npm test
```
