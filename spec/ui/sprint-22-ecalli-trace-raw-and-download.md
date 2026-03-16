# Sprint 22 — Ecalli Trace — Raw Mode + Download

## Goal

Add raw mode and download capability to the Ecalli Trace tab. Users can switch between formatted and raw views and download the execution trace as a `.log` file.

## What Works After This Sprint

- Tab header has a formatted/raw toggle
- Raw mode shows read-only textareas for execution and reference traces
- Raw text comes from `serializeTrace()` and is directly copyable
- Switching modes preserves scroll state and trace contents
- Download button exports the execution trace as `execution-trace-<timestamp>.log`
- Download works during stepping and after completion

## Prior Sprint Dependencies

- Sprint 21: Ecalli Trace tab with formatted view

## Required Files

```
apps/web/src/components/drawer/TraceRawView.tsx
apps/web/src/components/drawer/EcalliTraceTab.tsx  (extend with toggle + download)
apps/web/e2e/sprint-22-trace-raw.spec.ts
```

## Raw Mode Contract

- tab header exposes a formatted/raw toggle with visible text labels ("Formatted" / "Raw"), not icon-only
- raw mode shows read-only textareas for execution and reference traces
- text comes from `serializeTrace()`
- switching between modes must not discard current scroll state or trace contents

## Download Contract

- header includes a `Download` button with visible text label "Download"
- download content is the serialized execution trace
- filename: `execution-trace-<timestamp>.log`
- works during stepping and after completion

## E2E Tests

```
- raw mode toggle switches to textarea view
- raw mode shows serialized trace text
- switching back to formatted mode preserves content
- download produces a .log file
```

## Acceptance Criteria

- Formatted/raw toggle works without data loss.
- Raw mode shows serialized traces in read-only textareas.
- Download exports a `.log` file with the execution trace.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-22-trace-raw.spec.ts
```
