# UI-005 - Instructions Panel

## Purpose

Implement the left debugger column as a dense, virtualized disassembly view that supports:

- decoded instruction display
- current-PC highlighting
- breakpoint toggling
- basic-block folding
- ASM / Raw presentation modes
- binary inspection popovers

This panel is the primary navigation surface for stepping through a program, so it must remain accurate for both tiny fixtures and large real programs.

## Required Files

```
apps/web/src/components/debugger/InstructionsPanel.tsx
apps/web/src/components/debugger/InstructionRow.tsx
apps/web/src/components/debugger/InstructionBinary.tsx
apps/web/src/components/debugger/instruction-names.ts
apps/web/src/hooks/useDisassembly.ts
apps/web/src/hooks/useBasicBlocks.ts
apps/web/e2e/instructions-panel.spec.ts
```

## Disassembly Contract

`useDisassembly` must transform the currently loaded `ProgramEnvelope` into a stable list of decoded instructions.

Each instruction record must expose:

- `pc`
- `opcode`
- `mnemonic`
- `rawBytes`
- `args`
- `blockIndex`
- `isBlockStart`
- `isBlockEnd`

Rules:

- use `@typeberry/lib/pvm-interpreter` for instruction decoding, argument decoding, and basic-block boundaries
- opcode names are not exported by the library, so the canonical opcode-to-name map must live locally in `instruction-names.ts`
- for `jam_spi` programs, disassemble the decoded program code, not the raw SPI envelope bytes
- preserve browser-agnostic logic inside the hook; do not depend on DOM APIs there
- avoid eagerly formatting full-text render strings for every instruction when disassembling very large programs

## Display Contract

The panel header contains:

- the `Instructions` title
- an ASM / Raw mode toggle

The body renders a dense monospace list with:

- 4+ digit zero-padded hex PCs
- omega register notation (`ω0` through `ω12`) in ASM mode
- raw bytes / numeric values in Raw mode
- a subtle current-PC marker and row highlight
- a clickable breakpoint gutter

Rules:

- current instruction rows must auto-scroll into view
- PC width must expand for addresses larger than `0xFFFF`
- the instruction list itself is the scroll container
- the rest of the debugger page must not become the scrolling container

## Basic Block Contract

`useBasicBlocks` groups decoded instructions into ordered basic blocks and tracks collapsed state.

Each block must expose:

- `index`
- `startPc`
- `endPc`
- `instructions`
- `isCollapsed`

Rules:

- a block begins at program start and at each boundary reported by the decoder / basic-block analysis
- each block renders a header row labeled `Block N`
- clicking the header toggles collapse / expand for that block only
- collapsed blocks hide their instruction rows but keep the header visible

## Breakpoint Contract

Instruction rows must support local UI toggling plus orchestrator synchronization.

Rules:

- clicking the left gutter toggles the breakpoint for that instruction PC
- active breakpoints render as a small red dot
- the updated list is passed to `orchestrator.setBreakpoints(...)`
- local UI state must rehydrate from `orchestrator.getBreakpoints()` when the orchestrator instance changes

## Binary Inspection Contract

Clicking an instruction row opens a popover that explains the binary encoding.

The popover must show:

- raw instruction bytes
- opcode value
- decoded argument details

Rules:

- use shared-ui `Popover`
- keep the row itself clickable
- argument formatting must handle `bigint` values safely; do not call `JSON.stringify` on raw bigint-containing objects without conversion

## Virtualization Contract

The instruction list must use `@tanstack/react-virtual`.

Rules:

- only visible rows plus a modest overscan buffer may be mounted
- block headers and instruction rows may use different estimated heights
- large programs must not render the full instruction list into the DOM
- the scroll container must have a constrained height from the debugger layout

Implementation pitfall:

- if `.debugger-route` / `.debugger-shell` are allowed to grow with content, the virtualizer sees a viewport height equal to the full list height and mounts every row; fix the height chain at the route/layout level, not just inside the panel

## Empty State Contract

If no program envelope is available, the panel renders:

- title header
- body text `No program loaded`

## Testing Requirements

E2E coverage must prove:

- instructions render with omega notation in ASM mode
- the current PC row is highlighted
- breakpoint gutter clicks toggle a visible dot on and off
- ASM / Raw mode toggles change the rendered text
- block headers collapse and expand instruction rows
- clicking an instruction opens the binary popover
- a large fixture keeps the DOM row count bounded by virtualization

## Acceptance Criteria

- Disassembly is derived from the loaded program envelope and works for both plain programs and decoded SPI payloads.
- Opcode names match the canonical reference mapping.
- ASM mode displays mnemonics with omega register notation.
- Raw mode displays raw bytes / numeric operands without reloading the program.
- The current PC row is visibly highlighted and auto-scrolled into view.
- Breakpoint toggling updates both the UI dot state and the orchestrator breakpoint list.
- Instructions are grouped under collapsible block headers.
- Instruction clicks open a binary explanation popover without crashing on bigint-valued operands.
- Large programs remain virtualized; the DOM must stay bounded instead of rendering thousands of instruction rows at once.
- The instruction panel scrolls independently inside the debugger layout.
- Empty-state rendering shows `No program loaded`.
- `npm run build -w @pvmdbg/web` succeeds.
- `cd apps/web && npx playwright test e2e/instructions-panel.spec.ts` succeeds.
- `npm test` succeeds for the workspace.

## Verification

```bash
npm run build -w @pvmdbg/web
cd apps/web && npx playwright test e2e/instructions-panel.spec.ts
cd ../..
npm test
```
