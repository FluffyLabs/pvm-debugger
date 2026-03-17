# Sprint 29 — Registers — Inline Editing

Status: Implemented

## Goal

Make PC, gas, and all 13 registers editable inline on the registers panel. Edits fan out to all loaded PVMs through the orchestrator. Editing is only allowed when execution is paused with `ok` status.

## What Works After This Sprint

- Clicking a value (PC, gas, or register) swaps it into an inline input
- `Enter` commits the edit
- `Escape` cancels
- `blur` attempts commit
- Register and gas inputs accept decimal or `0x...` hex
- PC input accepts decimal or `0x...` hex but rejects negative values
- Edits apply to all loaded PVMs via `orchestrator.getPvmIds()` iteration
- Editing is disabled during running, host-call pause, and terminal states
- Edit mode preserves row height (no layout jumps)

## Prior Sprint Dependencies

- Sprint 04: registers panel (read-only display)
- Sprint 24: multi-PVM (edits fan out to all PVMs)

## Required Files

```
apps/web/src/components/debugger/RegistersPanel.tsx   (extend with editing)
apps/web/src/components/debugger/StatusHeader.tsx      (extend with PC/gas editing)
apps/web/src/components/debugger/RegisterRow.tsx       (extend with editing)
apps/web/e2e/sprint-29-register-editing.spec.ts
```

## Editing Contract

Rules:

- editing is allowed only when every active PVM is paused and selected snapshot status is `ok`
- clicking a displayed value swaps it into an inline input
- `Enter` commits
- `Escape` cancels
- `blur` attempts commit
- register and gas inputs accept decimal or `0x...` hex
- PC input accepts decimal or `0x...` hex but rejects negative values
- edits go through orchestrator methods — do not write adapter state directly
- edits fan out to all loaded PVMs by iterating `orchestrator.getPvmIds()`
- while execution is running, edit buttons must be disabled
- edit mode must preserve stable row height

## Value Parsing Contract

Use the shared `value-format.ts` module (Sprint 04):

- parse decimal strings
- parse `0x` hex strings
- reject invalid input with inline validation feedback
- reject negative values for PC

## Gas Secondary Hex Display

Gas field should expose its hex value via a secondary tooltip/popover affordance (informational, not editable through that affordance).

## E2E Tests

```
- clicking a register value enters edit mode
- Enter commits a new value
- Escape cancels the edit
- editing a register through hex input works
- PC rejects negative values
- editing is disabled during running state
- editing is disabled in terminal state
- gas shows a secondary hex tooltip
- edit mode does not change row height
```

## Acceptance Criteria

- PC, gas, and registers are editable inline while paused with `ok` status.
- Edits commit through the orchestrator to all loaded PVMs.
- Editing is disabled during running, host-call, and terminal states.
- Inputs accept decimal and hex.
- Edit mode preserves row height.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Implementation Notes

- Value parsing functions (`parseBigintInput`, `parsePcInput`, `formatGasHex`) added to `value-format.ts` alongside existing formatters
- `InlineEdit` is a local helper component inside `StatusHeader.tsx` (used for PC and gas editing), not a shared component — keeps it simple
- `RegisterRow` handles its own edit state internally; `editable` prop controls whether clicking activates edit mode
- Edit mode automatically cancels when `editable` becomes false (e.g. execution starts mid-edit)
- `minHeight` CSS on register rows prevents layout shift when toggling between display and input mode
- Gas hex tooltip uses `WithTooltip` from `@fluffylabs/shared-ui` for consistency with existing tooltip patterns
- All edits fan out to all PVMs by iterating `orchestrator.getPvmIds()` — errors are caught per-PVM and logged
- The `editable` guard checks `lifecycle === "paused" && snapshot.status === "ok"` — this correctly excludes running, host-call, and all terminal states

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-29-register-editing.spec.ts
```
