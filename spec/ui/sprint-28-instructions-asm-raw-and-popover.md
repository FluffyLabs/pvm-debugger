# Sprint 28 — Instructions — ASM/Raw Toggle + Binary Popover

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
