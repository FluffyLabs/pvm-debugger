# Sprint 04 — Registers + Status Display (Read-Only)

Status: Implemented

## Goal

Show the complete machine state of the selected PVM on the debugger page: a status badge, the program counter, gas counter, and all 13 registers. Everything is read-only in this sprint — editing comes in Sprint 29.

## What Works After This Sprint

- Status badge shows `OK` after program load
- PC displays in zero-padded hex
- Gas displays in decimal with thousands separators
- All 13 registers (ω0–ω12) display as `0x... (decimal)`
- Values reflect the initial loaded state

## Prior Sprint Dependencies

- Sprint 02: orchestrator context, loaded program
- Sprint 03: debugger page has content (instructions panel)

## Required Files

```
apps/web/src/components/debugger/RegistersPanel.tsx
apps/web/src/components/debugger/StatusHeader.tsx
apps/web/src/components/debugger/RegisterRow.tsx
apps/web/src/components/debugger/value-format.ts
apps/web/src/hooks/useOrchestratorState.ts
apps/web/e2e/sprint-04-registers.spec.ts
```

## Reactive State Hook Contract

`useOrchestratorState()` must expose:

```ts
interface OrchestratorReactiveState {
  snapshots: Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>;
  selectedPvmId: string | null;
  hostCallInfo: Map<string, HostCallInfo>;
  isStepInProgress: boolean;
}
```

Rules:

- subscribe to `pvmStateChanged`, `hostCallPaused`, `terminated`, and `error` events
- remove all listeners during cleanup
- keep `selectedPvmId` stable when possible

This hook is shared across all panels. It must live at the orchestrator-context level, not be duplicated per panel.

## Status Badge Contract

Map `PvmLifecycle` + `PvmStatus` to user-facing labels:

- `running` → `Running`
- `paused` + `status === "ok"` → `OK`
- `paused_host_call` → `Host Call`
- `terminated` + `halt` → `Halt`
- `terminated` + `panic` → `Panic`
- `terminated` + `fault` → `Fault`
- `terminated` + `out_of_gas` → `Out of Gas`
- `failed` → `Error`
- `timed_out` → `Timeout`

Rules:

- do not show `Paused` for the normal idle state — show `OK`
- use distinct visual tones for OK, Running, Host Call, terminal faults, and timeout

## Value Formatting Contract

All formatting lives in `value-format.ts`:

- registers: hex (at least 16 digits) plus decimal, always together
- PC: hex only, zero-padded, width expands past 4 digits as needed
- gas: decimal with thousands separators

## Display Contract

Header content:

- unified status badge
- PC field (read-only hex)
- gas field (read-only decimal)

Body content:

- 13 rows labeled ω0 through ω12
- each row: `ωN: 0x... (decimal)`

Rules:

- dense monospace layout
- stable row heights (no layout jumps)

## E2E Tests

```
- status shows "OK" after program load
- PC renders in hex
- gas renders in decimal with thousands separators
- all 13 register rows render with omega labels
- register values show hex and decimal
```

## Acceptance Criteria

- The registers panel renders status, PC, gas, and all 13 registers.
- Status badge shows `OK` for paused idle state.
- Registers show `0x... (decimal)` with omega labels.
- PC renders in hex with adaptive zero-padding.
- Gas renders in decimal with thousands separators.
- Formatting logic lives in a shared `value-format.ts` module.
- The reactive state hook is shared, not duplicated per panel.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-04-registers.spec.ts
```
