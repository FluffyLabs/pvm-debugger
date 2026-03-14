# UI-011 - Bottom Drawer - Ecalli Trace Tab

## Purpose

Implement the `Ecalli Trace` drawer tab as the side-by-side trace viewer for the currently selected PVM.

The tab compares:

- the execution trace recorded by the orchestrator during the current run
- the reference trace loaded with the current program, when available

The view must stay useful both for live stepping and for completed runs.

## Required Files

```
apps/web/src/components/drawer/EcalliTraceTab.tsx
apps/web/src/components/drawer/TraceColumn.tsx
apps/web/src/components/drawer/TraceEntryRow.tsx
apps/web/src/components/drawer/TraceRawView.tsx
apps/web/src/components/drawer/trace-display.ts
apps/web/e2e/drawer-ecalli-trace.spec.ts
```

## Layout Contract

Formatted mode renders two columns:

- `Execution Trace`
- `Reference Trace`

Rules:

- both columns use dense monospace rendering
- each column scrolls independently
- a `Link scroll` toggle mirrors vertical scrolling between the two columns
- when no reference trace exists, the right column shows `No reference trace loaded.`

## Trace Rendering Contract

Each recorded entry renders in a human-readable ECALLI-style block.

Rules:

- include a small host-call name badge derived from `HOST_CALL_NAMES`
- show the header line as `ecalli <index>, ω7 = <gas>`
- show memory reads, memory writes, register writes, and gas updates on separate lines
- termination rows render `halt`, `panic`, `fault`, or `oog`
- log host calls (`index === 100`) decode the message text from the longest memory read and render it as readable UTF-8 when possible
- invalid UTF-8 falls back to hex

## Raw Mode Contract

The tab header exposes a formatted/raw switch.

Rules:

- raw mode shows read-only textareas for execution and reference traces
- the text comes from `serializeTrace()` and remains directly copyable
- formatted/raw mode switching must not discard current scroll state or trace contents

## Mismatch Contract

Trace comparison uses `compareTraces()` from `@pvmdbg/trace`.

Rules:

- mismatching rows are visually highlighted in both columns
- mismatched rows include a visible `≠` indicator
- matching rows have no mismatch styling
- mismatch detection is positional, following the shared trace comparator semantics

## Download Contract

The header includes a `Download` action for the execution trace.

Rules:

- download content is the serialized execution trace
- filename pattern is `execution-trace-<timestamp>.log`
- the button works while stepping and after completion

## Implementation Notes

- consume `orchestrator.getRecordedTrace(selectedPvmId)` and `getReferenceTrace(selectedPvmId)` reactively
- keep the tab name as `Ecalli Trace`
- reuse shared formatting helpers instead of re-implementing hex / UTF-8 decoding in multiple components
- keep all interactive controls addressable with `data-testid`

## Testing Requirements

E2E coverage must prove:

- the tab opens and shows execution plus reference columns
- a recorded log entry appears with readable text and a `log` badge
- raw mode renders serialized textarea output
- download produces a `.log` file
- mismatches are highlighted after execution diverges from the reference trace
- linked scroll moves the opposite column

## Acceptance Criteria

- The drawer tab is labeled `Ecalli Trace`.
- Recorded entries appear live while execution progresses.
- Reference trace entries remain visible when the loaded program came from a trace file.
- Every entry row includes a readable host-call badge.
- Log host calls render decoded message text instead of raw hex only.
- Raw mode shows serialized execution/reference traces in read-only textareas.
- The execution trace can be downloaded as a `.log` file.
- Mismatching rows are highlighted and marked with `≠`.
- Linked scroll keeps the two trace columns aligned.
- `npm run build -w @pvmdbg/web` succeeds.
- `cd apps/web && npx playwright test e2e/drawer-ecalli-trace.spec.ts` succeeds.

## Verification

```bash
npm run build -w @pvmdbg/web
cd apps/web && npx playwright test e2e/drawer-ecalli-trace.spec.ts
```
