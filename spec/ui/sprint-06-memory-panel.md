# Sprint 06 — Memory Panel (Basic, Read-Only)

Status: Implemented

## Goal

Add a read-only memory inspector to the debugger page. Memory is split into individual 4 KiB pages from the page map, all collapsed by default. Expanding a page shows a dense 16-byte hex dump with ASCII sidebar.

No editing, no SPI-aware labels, no change highlighting yet.

## What Works After This Sprint

- Memory panel shows collapsed page sections sorted by address
- Expanding a page lazily fetches and renders a hex dump
- Hex dump shows: 8-digit address | 16 hex bytes | ASCII
- Zero bytes are visually de-emphasized
- Programs with no pages show `No memory pages.`

## Prior Sprint Dependencies

- Sprint 02: orchestrator with loaded program
- Sprint 04: reactive state hook

## Required Files

```
apps/web/src/components/debugger/MemoryPanel.tsx
apps/web/src/components/debugger/MemoryRange.tsx
apps/web/src/components/debugger/HexDump.tsx
apps/web/src/hooks/useMemoryReader.ts
apps/web/e2e/sprint-06-memory.spec.ts
```

## Page Range Contract

The panel consumes `orchestrator.getPageMap()` and expands each segment into individual 4 KiB pages.

Rules:

- each page is its own collapsible section
- pages are sorted by ascending address
- pages start collapsed
- do not bundle multi-page segments into a single collapsible
- do not render an infinite-scroll memory view
- page headers show `Page @ 0x{address}` (SPI-aware naming comes in Sprint 31)

## Hex Dump Contract

Expanded page bodies render a `HexDump` component:

- 16 bytes per row
- left address column uses 8-digit hex
- right ASCII column shows printable bytes and `.` for non-printable
- zero bytes are visually de-emphasized (dimmed)
- the dump must not wrap — horizontal overflow stays inside the hex dump container

## Memory Reader Contract

`useMemoryReader` handles page fetching:

- reads go through `orchestrator.getMemory(pvmId, address, length)`
- fetch page contents only when expanded (lazy)
- cache contents by base address
- invalidate cache after snapshot changes

## Empty State

If the page map is empty, render: `No memory pages.`

## Implementation Pitfall

When the memory panel body is a CSS grid, collapsed sections can overlap if auto rows are left implicit. Force `max-content` sizing for each row so headers remain independently clickable.

## E2E Tests

```
- memory panel shows collapsed page headers after loading a program with memory
- clicking a page header expands it to show hex dump
- clicking again collapses it
- hex dump shows address, hex bytes, and ASCII columns
- zero bytes are visually dimmed
- a program with empty page map shows "No memory pages."
```

## Acceptance Criteria

- The memory panel shows only the ranges view; no infinite-scrolling mode exists.
- Each 4 KiB page is its own collapsible section, collapsed by default.
- Expanding a page lazily fetches contents and renders a hex dump.
- Hex dumps render 16 bytes per row with address and ASCII columns.
- Zero bytes are visually de-emphasized.
- Empty state renders `No memory pages.`
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

### Implementation Notes & Edge Cases

- **Cache invalidation**: `useOrchestratorState` exposes a `snapshotVersion` counter (monotonic, incremented on every `pvmStateChanged` event) that `useMemoryReader` uses to invalidate its page cache. This ensures memory contents refresh after stepping.
- **Overlapping page map segments**: `expandPages()` deduplicates addresses via `Set` after expanding segments, so overlapping entries don't produce duplicate collapsible sections.
- **Flex layout over CSS grid**: Used flex column layout instead of CSS grid to avoid the collapsed-section overlap pitfall noted in the spec. Each `MemoryRange` is a self-contained block element.
- **Lazy re-fetch on expand after invalidation**: If a page is expanded and the cache is invalidated (due to stepping), `MemoryRange` triggers a re-fetch via `useEffect` so the user sees updated data without needing to collapse/re-expand.
- **Test fixture selection**: `store-u16` (has `pageMap` with one writable page at `0x20000`) is used for memory-present tests; `step-test` (no `pageMap`) is used for the empty-state test.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-06-memory.spec.ts
```
