# Sprint 28 — Instructions — ASM/Raw Toggle + Binary Popover

Status: Implemented

## Goal

Add a display mode toggle (ASM / Raw) to the instructions panel header and a binary inspection popover that opens when clicking an instruction row.

## What Works After This Sprint

- Panel header includes an ASM / Raw toggle
- ASM mode shows mnemonics with omega register notation (ω0–ω12) — the current default
- Raw mode shows raw bytes and numeric operand values
- Toggling does not reload the program
- Clicking an instruction row opens a popover with binary encoding details
- The popover handles bigint values safely (no JSON.stringify crash)

## Prior Sprint Dependencies

- Sprint 03: instruction display
- Sprint 27: block folding + virtualization

## Required Files

```
apps/web/src/components/debugger/InstructionBinary.tsx
apps/web/src/components/debugger/InstructionsPanel.tsx  (extend with toggle)
apps/web/src/components/debugger/InstructionRow.tsx     (extend with popover)
apps/web/e2e/sprint-28-asm-raw-popover.spec.ts
```

## ASM / Raw Toggle Contract

Panel header includes a toggle for display mode:

- ASM mode: mnemonics with omega register notation (existing behavior)
- Raw mode: raw instruction bytes and numeric operand values

Rules:

- the toggle must have visible text labels ("ASM" / "Raw"), not icon-only
- toggling does not reload or re-decode the program
- both modes render in dense monospace
- the toggle state does not need to persist across page reloads

## Binary Inspection Popover Contract

Clicking an instruction row opens a popover showing:

- raw instruction bytes
- opcode value
- decoded argument details

Rules:

- use shared-ui `Popover`
- keep the row itself clickable (the popover opens, but gutter clicks still toggle breakpoints)
- argument formatting must handle `bigint` values safely — do not call `JSON.stringify` on raw bigint-containing objects without conversion

## E2E Tests

```
- ASM mode shows omega notation
- toggling to Raw mode changes displayed text
- toggling back to ASM restores omega notation
- clicking an instruction opens the binary popover
- the popover shows raw bytes and opcode
```

## Acceptance Criteria

- ASM / Raw toggle works without program reload.
- ASM mode uses omega register notation.
- Raw mode shows bytes and numeric values.
- Binary popover opens on instruction click.
- Popover handles bigint values safely.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-28-asm-raw-popover.spec.ts
```

## Implementation Notes

### Data model changes
- `DecodedInstruction` (in `useDisassembly.ts`) gained a `rawArgs: string` field — numeric-only operand formatting (register indices as plain numbers, no omega notation). Both `args` and `rawArgs` are pre-computed during disassembly via a shared `formatArgsWithReg()` function parameterized by register formatter.

### Component structure
- **Popover trigger area**: the row is split — the breakpoint gutter (`breakpoint-gutter-{pc}`) handles breakpoint toggles via `onClick`, while the rest of the row is wrapped in a `PopoverTrigger` (`instruction-trigger-{pc}`). Each `InstructionRow` wraps in its own `<Popover>` context (Radix handles single-open behavior).
- **`bytesToHex`** utility lives in `value-format.ts` (shared by both `InstructionRow` and `InstructionBinary`).
- **`DisplayMode` type** is exported from `InstructionRow.tsx` and imported by `InstructionsPanel.tsx`.

### Edge cases and pitfalls
- The `rawArgs` field for no-argument instructions (e.g. `trap`) is an empty string, same as `args`. Both conditional renders (`instruction.args &&` / `instruction.rawArgs &&`) handle this correctly.
- Popover content avoids `JSON.stringify` on any object that might contain bigint values — all values are pre-formatted to strings during disassembly.
- Toggling display mode does NOT re-run disassembly (just a React state change controlling which fields render). Both args formats are pre-computed in `useMemo`.

### Data-testid inventory (sprint-28 additions)
```
display-mode-toggle           — toggle container
display-mode-asm              — ASM button
display-mode-raw              — Raw button
instruction-trigger-{pc}      — popover trigger area (excludes gutter)
instruction-raw-bytes         — raw bytes hex (raw mode only)
instruction-raw-args          — numeric args (raw mode only)
instruction-binary-popover    — popover content root
popover-raw-bytes             — raw bytes inside popover
popover-opcode                — opcode value inside popover
```
