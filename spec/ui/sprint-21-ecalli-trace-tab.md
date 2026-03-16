# Sprint 21 — Ecalli Trace Tab

## Goal

Replace the Ecalli Trace drawer placeholder with a side-by-side trace comparison viewer. The left column shows the execution trace recorded during the current run; the right column shows the reference trace loaded with the program. Mismatches are highlighted.

## What Works After This Sprint

- Ecalli Trace tab shows two columns: Execution Trace and Reference Trace
- Recorded entries appear live as execution progresses
- Reference trace entries are visible when the program came from a trace file
- Each entry shows a host-call name badge and formatted details
- Log host calls (index 100) decode message text as UTF-8
- Mismatching rows are highlighted and marked with `≠`
- Linked scroll toggle mirrors vertical scrolling between columns
- When no reference trace exists, right column shows `No reference trace loaded.`

## Prior Sprint Dependencies

- Sprint 14: drawer shell
- Sprint 18: host-call resume flow (so traces accumulate during execution)

## Required Files

```
apps/web/src/components/drawer/EcalliTraceTab.tsx
apps/web/src/components/drawer/TraceColumn.tsx
apps/web/src/components/drawer/TraceEntryRow.tsx
apps/web/src/components/drawer/trace-display.ts
apps/web/e2e/sprint-21-ecalli-trace.spec.ts
```

## Layout Contract

Two columns in formatted mode:

- `Execution Trace` (left)
- `Reference Trace` (right)

Rules:

- both columns use dense monospace rendering
- each column scrolls independently by default
- `Link scroll` toggle (with visible text label, not icon-only) mirrors vertical scrolling between columns
- when no reference trace exists, right column shows `No reference trace loaded.`

## Trace Rendering Contract

Each entry renders as a human-readable ECALLI-style block:

- small host-call name badge from `HOST_CALL_NAMES`
- header line: `ecalli <index>, ω7 = <gas>`
- memory reads, memory writes, register writes, gas updates on separate lines
- termination rows render `halt`, `panic`, `fault`, or `oog`
- log host calls (index 100) decode the longest memory read as UTF-8 when possible
- invalid UTF-8 falls back to hex

## Mismatch Contract

Use `compareTraces()` from `@pvmdbg/trace`.

Rules:

- mismatching rows are visually highlighted in both columns
- mismatched rows include a visible `≠` indicator
- matching rows have no mismatch styling
- comparison is positional

## Data Sources

- `orchestrator.getRecordedTrace(selectedPvmId)` for execution trace
- `orchestrator.getReferenceTrace(selectedPvmId)` for reference trace

## E2E Tests

```
- the tab opens and shows execution and reference columns
- a recorded log entry appears with readable text and a "log" badge
- mismatches are highlighted after execution diverges from reference
- linked scroll moves the opposite column
- no reference trace shows the empty-state message
```

## Acceptance Criteria

- Recorded entries appear live during execution.
- Reference trace entries are visible for trace-backed programs.
- Each entry includes a host-call name badge.
- Log host calls render decoded message text.
- Mismatching rows are highlighted with `≠`.
- Linked scroll keeps columns aligned.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-21-ecalli-trace.spec.ts
```
