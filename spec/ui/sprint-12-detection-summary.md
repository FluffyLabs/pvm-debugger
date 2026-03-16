# Sprint 12 — Detection Summary (Wizard Step 2)

## Goal

Add a real wizard step 2 between source selection and program loading. This step shows a format-specific summary of the detected program before the user commits to loading it. Back navigation returns to step 1.

## What Works After This Sprint

- After selecting a source, step 2 shows a detection summary card
- Summary content varies by detected format (JAM SPI, trace, JSON vector, generic)
- `Load Program` button initializes the orchestrator and navigates to debugger
- `Back` returns to step 1 with the candidate preserved
- Invalid decodes surface an error with a `Try as Generic PVM` fallback

## Prior Sprint Dependencies

- Sprint 10–11: source selection, rawPayload, detectedFormat

## Required Files

```
apps/web/src/components/load/ConfigStep.tsx
apps/web/src/components/load/DetectionSummary.tsx
apps/web/src/pages/LoadPage.tsx                    (extend with step state)
apps/web/e2e/sprint-12-detection-summary.spec.ts
```

## Wizard Step State Contract

`LoadPage` owns:

- `step` (1 or 2)
- `rawPayload`
- `detectedFormat`
- `exampleEntry`

Rules:

- step 1 renders the source selector
- step 2 renders the config/summary screen
- advancing from step 1 carries the real payload and detected format
- `Back` returns to step 1 without losing the selected candidate
- step 1 rehydrates its candidate summary from the stored payload on return

## Detection Summary Contract

Render one compact summary card with format-specific content:

### JAM SPI (with or without metadata)

- metadata text (if present)
- binary size, decoded code size
- jump-table entry count
- memory segment count with readable/writable split
- initial PC and gas
- initial register preview

### Trace files

- trace host-call entry count
- extracted program kind
- code size
- initial PC and gas from trace prelude
- initial register preview
- must not render SPI entrypoint controls

### JSON PVM test vectors

- test name
- program size
- initial PC and gas
- register count and non-zero count
- expected terminal status

### Generic PVM blobs

- program size
- initial state summary
- initial register preview

### Invalid decodes

- destructive alert with the decode error
- `Try as Generic PVM` fallback button (unless already forced generic)
- generic fallback reinterprets bytes through `decodeGenericProgram()`

## Load Program Contract

The `Load Program` button:

1. builds a `ProgramEnvelope`
2. initializes the orchestrator with the PVM set (default: typeberry only for now)
3. calls `orchestrator.loadProgram(envelope)`
4. applies `orchestrator.setTrace()` when the envelope contains a trace
5. navigates to `/`

## No Gas Editing

Step 2 must not expose gas editing. Gas comes from source defaults.

## E2E Tests

```
- step 2 renders after selecting a source in step 1
- SPI example shows metadata and structural details
- JSON vector shows expected terminal status
- Load Program navigates to debugger with OK status
- Back returns to step 1 with candidate preserved
- invalid payload shows error and generic fallback option
```

## Acceptance Criteria

- Detection summary renders format-specific data for all source types.
- Invalid decodes surface errors and offer generic fallback.
- `Load Program` initializes orchestrator and navigates to debugger.
- Back navigation preserves the candidate.
- No gas editor on step 2.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-12-detection-summary.spec.ts
```
