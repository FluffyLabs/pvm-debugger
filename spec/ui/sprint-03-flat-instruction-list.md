# Sprint 03 — Flat Instruction List

Status: Implemented

## Goal

After loading a program, display the disassembled instructions as a flat, dense, monospace list on the debugger page. The current PC row is highlighted and auto-scrolled into view.

No breakpoints, no blocks, no virtualization, no ASM/Raw toggle yet — just a correct, readable instruction listing.

## What Works After This Sprint

- Debugger page shows all disassembled instructions
- Each row shows: zero-padded hex PC | mnemonic | arguments
- Current PC row is visually highlighted
- Current PC row auto-scrolls into view
- omega register notation (ω0–ω12) is used for register arguments

## Prior Sprint Dependencies

- Sprint 02: orchestrator context, loaded program, debugger page

## Required Files

```
apps/web/src/components/debugger/InstructionsPanel.tsx
apps/web/src/hooks/useDisassembly.ts
apps/web/src/components/debugger/instruction-names.ts
apps/web/e2e/sprint-03-instructions.spec.ts
```

## Disassembly Contract

`useDisassembly` transforms the loaded `ProgramEnvelope` into a stable list of decoded instructions.

Each instruction record exposes:

- `pc` — program counter offset
- `opcode` — numeric opcode
- `mnemonic` — human-readable name
- `rawBytes` — the raw instruction bytes
- `args` — decoded arguments

Rules:

- use `@typeberry/lib/pvm-interpreter` for instruction decoding and argument decoding
- opcode names are not exported by the library — maintain the canonical map in `instruction-names.ts`
- for `jam_spi` programs, disassemble the decoded program code, not the raw SPI envelope bytes
- keep the hook browser-agnostic (no DOM APIs)

## Display Contract

The panel renders a flat list with:

- 4+ digit zero-padded hex PCs (width expands for addresses > 0xFFFF)
- mnemonic name
- arguments with omega register notation (ω0 through ω12)
- a visible current-PC marker and row background highlight
- auto-scroll to keep the current PC row in view

Rules:

- the instruction list is its own scroll container
- the rest of the page must not become the scrolling container

## Empty State

If no program envelope is available, show: `No program loaded`.

## E2E Tests

```
- instructions render after loading a program
- instruction rows show hex PC and mnemonic
- register arguments use omega notation (ω)
- current PC row is visually highlighted
- empty state shows "No program loaded" before a program is loaded
```

## Acceptance Criteria

- Disassembly is derived from the loaded program envelope.
- Opcode names match the canonical reference mapping.
- Instructions display with omega register notation.
- Current PC row is highlighted and auto-scrolled into view.
- PC column width adapts to address size.
- Empty state renders `No program loaded`.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-03-instructions.spec.ts
```
