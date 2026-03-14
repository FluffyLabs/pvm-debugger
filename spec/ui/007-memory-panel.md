# UI-007 - Memory Panel

## Purpose

Implement the right debugger column as a page-oriented memory inspector and editor.

The panel must:

- split memory into individual 4KB pages
- keep all pages collapsed by default
- lazy-load page contents on expansion
- render a dense 16-byte hex dump with ASCII
- support inline byte editing
- highlight bytes that changed after execution resumes

## Required Files

```
apps/web/src/components/debugger/MemoryPanel.tsx
apps/web/src/components/debugger/MemoryRange.tsx
apps/web/src/components/debugger/HexDump.tsx
apps/web/src/hooks/useMemoryReader.ts
apps/web/e2e/memory-panel.spec.ts
```

## Page Range Contract

The panel consumes `orchestrator.getPageMap()` and expands each page-map segment into separate 4KB pages.

Rules:

- do not render an infinite-scroll memory view
- do not bundle multi-page segments into a single collapsible
- each page renders as its own range header and optional body
- pages are sorted by ascending address
- pages start collapsed

Implementation pitfall:

- when the memory panel body is a CSS grid, collapsed sections can overlap if auto rows are left implicit; force max-content sizing for each row so headers remain independently clickable

## SPI-Aware Naming Contract

For SPI programs, page labels must reflect the expected memory layout.

Required labels:

- `RO Data`
- `RW Data`
- `Heap`
- `Stack`
- `Arguments`

Rules:

- `Arguments` page lives at `0xFEFF0000`
- pages from `0xFEFE0000` up to `0xFEFF0000` are `Stack`
- non-writable pages from `0x00010000` upward are `RO Data`
- writable pages backed by initialized writable chunks are `RW Data`
- other writable SPI pages above the reserved region are `Heap`
- non-SPI or unknown pages fall back to `Page @ 0x...`

## Hex Dump Contract

Expanded page bodies render a reusable `HexDump` component.

Rules:

- 16 bytes per row
- left address column uses 8-digit hex
- right ASCII column shows printable bytes and `.` for non-printable bytes
- the dump must never wrap; horizontal scrolling stays inside the hex dump container
- zero bytes are visually de-emphasized
- changed bytes get a distinct highlight class

## Memory Reader Contract

`useMemoryReader` handles page fetching and diff tracking.

Rules:

- reads go through `orchestrator.getMemory(pvmId, address, length)`
- cache page contents by base address
- invalidate the active cache after each selected-PVM snapshot change
- preserve the previous page snapshot so changed-byte computation can compare old vs new page contents
- expose a lightweight way to remember optimistic page updates after local edits

## Editing Contract

Memory editing happens only in this panel.

Rules:

- editing is allowed only when every active PVM is paused and the selected snapshot status is `ok`
- only writable pages are editable
- clicking a byte cell swaps that cell into a borderless inline input
- typing two hex digits writes one byte and advances focus to the next cell
- `Backspace` on an empty editor moves focus to the previous cell
- paste accepts hex text, strips separators, and writes consecutive bytes within the same page
- editing must not cause row-height or cell-width reflow
- writes fan out to all loaded PVMs through `orchestrator.setMemory(...)`

## Change Highlighting Contract

Changed-byte highlighting is driven by real state transitions, not by local draft buffers alone.

Rules:

- when a page is re-read after a step / host-call resume / state edit, compare it against the previous cached page
- highlight only byte offsets whose values actually changed
- preserve optimistic local page edits in the current cache until the next invalidation

## Empty State Contract

If the page map is empty, render:

- panel title
- body text `No memory pages.`

## Testing Requirements

E2E coverage must prove:

- SPI programs render collapsed 4KB pages with meaningful labels
- page headers expand and collapse
- generic programs with empty page maps show the empty state
- expanded dumps show address / bytes / ASCII and dim zero bytes
- typing two hex digits writes and advances
- backspace moves to the previous byte editor
- paste fills consecutive cells
- trace-backed memory writes produce changed-byte highlights
- editing is disabled outside `OK`

## Acceptance Criteria

- The memory column shows only the ranges view; no infinite-scrolling mode exists.
- Each 4KB page is rendered as its own collapsible section.
- Page headers are collapsed by default and remain individually clickable.
- Expanding a page lazily fetches its contents.
- Hex dumps render 16 bytes per row with address and ASCII columns.
- Zero bytes are visually de-emphasized.
- SPI-aware labels distinguish RO data, RW data, heap, stack, and arguments pages.
- Byte edits are inline, borderless, and do not cause layout reflow.
- Typed bytes auto-advance, backspace moves backward, and paste fills consecutive bytes within the page.
- Memory writes fan out through the orchestrator to all loaded PVMs.
- Trace-backed or stepped memory changes are highlighted by byte offset after reload.
- The panel renders `No memory pages.` when no page map is available.
- `npm run build -w @pvmdbg/web` succeeds.
- `cd apps/web && npx playwright test e2e/memory-panel.spec.ts` succeeds.
- `npm run build` succeeds for the workspace.
- `npm test` succeeds for the workspace.

## Verification

```bash
npm run build -w @pvmdbg/web
cd apps/web && npx playwright test e2e/memory-panel.spec.ts
cd ../..
npm run build
npm test
```
