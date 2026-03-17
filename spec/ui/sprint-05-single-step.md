# Sprint 05 — Single-Step (Next Button)

Status: Implemented

## Goal

Add the first execution control: a `Next` button that steps exactly one instruction. After clicking, the instructions panel updates the current PC highlight and the registers panel shows the new machine state. This is the first real user interaction with the running PVM.

## What Works After This Sprint

- A `Next` button appears on the debugger page
- Clicking it advances execution by one instruction
- The instruction panel's current-PC highlight moves
- Registers, PC, and gas update to reflect the new state
- The button is disabled while a step is in progress

## Prior Sprint Dependencies

- Sprint 03: instructions panel with current-PC highlighting
- Sprint 04: registers panel with reactive state

## Required Files

```
apps/web/src/components/debugger/ExecutionControls.tsx
apps/web/src/hooks/useDebuggerActions.ts
apps/web/e2e/sprint-05-single-step.spec.ts
```

## Toolbar Contract

Place a minimal toolbar row above the debugger content containing:

- `Next` button

More buttons (Run, Pause, Reset, Load) come in Sprint 08. For now, only `Next` is needed.

Rules:

- `Next` always steps exactly one instruction via `orchestrator.step(1)`
- the button must have a visible text label "Next" (not icon-only) and an `aria-label`
- the button uses `cursor: pointer`
- the button is disabled while `isStepInProgress` is true
- the button is disabled when the PVM is in a terminal state

## Action Contract

`useDebuggerActions` owns toolbar behavior. In this sprint it exposes:

- `next()` — calls `orchestrator.step(1)`

Rules:

- the action must not be callable while a step is already in progress
- after stepping, the reactive state hook picks up the new snapshot automatically

## E2E Tests

```
- Next button is visible on the debugger page
- clicking Next advances the PC (PC value changes)
- gas decreases after stepping
- at least one register value changes after stepping a program with register-writing instructions
- Next button is disabled during step execution and re-enables after
- Next button stays disabled in terminal state
- instruction panel highlight moves after stepping
```

## Acceptance Criteria

- The `Next` button renders on the debugger page.
- Clicking it steps exactly one instruction.
- The instructions panel moves the current-PC highlight.
- The registers panel updates PC, gas, and register values.
- The button is disabled during step execution and in terminal states.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass (7 tests).

## Implementation Notes & Pitfalls

### React rules of hooks
`useDebuggerActions` must be called BEFORE the route guard early return in
`DebuggerPage`. Moving it after the `if (!orchestrator) return <Navigate>` block
violates React's rules of hooks (conditional hook count across renders).

### Fixture opcode incompatibility
The existing generic `.pvm` fixtures (`add.pvm`, `fibonacci.pvm`, etc.) use
PVM-spec opcode values (e.g., `add_32 = 4`), but typeberry uses different
internal opcode values (`ADD_32 = 190`, `LOAD_IMM = 51`). These programs
**panic immediately** on the first step when loaded via typeberry.

A `step-test.pvm` fixture was created using typeberry-compatible opcodes
(a single `LOAD_IMM r0=42` instruction, opcode 51). This is the only generic
fixture that reliably survives stepping. Future sprints needing multi-step
programs should either:
- Create fixtures with typeberry opcodes and matching instruction boundary masks
- Use a program format that handles opcode translation (JAM SPI programs go through
  `resetJAM()` which may use a different encoding path)

### Instruction boundary mask
`encodePvmBlob()` only marks byte 0 as an instruction start by default.
Multi-instruction programs need explicit `instructionStarts` arrays passed to
`encodePvmBlob`, but `decodeGeneric()` doesn't support this yet. Single-instruction
fixtures work correctly with the default `[0]` mask.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-05-single-step.spec.ts
```
