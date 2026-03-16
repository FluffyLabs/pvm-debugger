# Sprint 31 — Memory — SPI Labels + Inline Editing

## Goal

Enhance the memory panel with SPI-aware page labels and inline byte editing. Users can identify memory sections by name (RO Data, Stack, etc.) and edit individual bytes directly in the hex dump.

## What Works After This Sprint

- SPI programs show named page labels: RO Data, RW Data, Heap, Stack, Arguments
- Non-SPI programs fall back to `Page @ 0x...`
- Clicking a byte cell in a writable page opens an inline hex editor
- Typing two hex digits writes one byte and advances to the next cell
- Backspace moves focus to the previous cell
- Paste accepts hex text and fills consecutive bytes within the page
- Editing does not cause layout reflow
- Writes fan out to all PVMs through `orchestrator.setMemory()`
- Only writable pages are editable
- Editing is disabled when not paused with `ok` status

## Prior Sprint Dependencies

- Sprint 06: memory panel (read-only, basic hex dump)
- Sprint 24: multi-PVM (writes fan out)

## Required Files

```
apps/web/src/components/debugger/MemoryPanel.tsx   (extend)
apps/web/src/components/debugger/MemoryRange.tsx   (extend)
apps/web/src/components/debugger/HexDump.tsx       (extend with editing)
apps/web/e2e/sprint-31-memory-editing.spec.ts
```

## SPI-Aware Naming Contract

For SPI programs, page labels reflect the expected memory layout:

- `Arguments` — page at `0xFEFF0000`
- `Stack` — pages from `0xFEFE0000` up to `0xFEFF0000`
- `RO Data` — non-writable pages from `0x00010000` upward
- `RW Data` — writable pages backed by initialized writable chunks
- `Heap` — other writable SPI pages above the reserved region
- Non-SPI or unknown pages: `Page @ 0x...`

## Editing Contract

Rules:

- editing is allowed only when every active PVM is paused with `ok` status
- only writable pages are editable
- clicking a byte cell swaps it into a borderless inline input
- typing two hex digits writes one byte and advances focus to the next cell
- `Backspace` on an empty editor moves focus to the previous cell
- paste accepts hex text, strips separators, and writes consecutive bytes within the same page
- editing must not cause row-height or cell-width reflow
- writes fan out to all loaded PVMs through `orchestrator.setMemory()`

## E2E Tests

```
- SPI programs show named labels (RO Data, Stack, etc.)
- non-SPI programs show "Page @ 0x..."
- typing two hex digits writes and advances to next byte
- backspace moves to previous byte
- paste fills consecutive cells
- read-only pages are not editable
- editing is disabled when not paused with OK status
```

## Acceptance Criteria

- SPI-aware labels distinguish memory sections.
- Inline byte editing works with auto-advance and backspace.
- Paste fills consecutive bytes.
- Only writable pages are editable.
- Writes fan out to all PVMs.
- Editing is disabled outside paused `ok` state.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-31-memory-editing.spec.ts
```
