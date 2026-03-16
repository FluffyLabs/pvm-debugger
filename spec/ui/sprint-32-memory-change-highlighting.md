# Sprint 32 — Memory — Change Highlighting

## Goal

Add change tracking to the memory panel. After stepping, host-call resume, or state editing, bytes that changed are visually highlighted. This helps users quickly spot the effects of execution on memory.

## What Works After This Sprint

- After a step or host-call resume, re-reading a page highlights changed bytes
- Only byte offsets whose values actually changed get highlighted
- Optimistic local edits are preserved in the cache until the next invalidation
- Change highlighting is driven by real state transitions, not draft buffers alone

## Prior Sprint Dependencies

- Sprint 06: memory reader with caching
- Sprint 31: memory editing

## Required Files

```
apps/web/src/hooks/useMemoryReader.ts              (extend with diff tracking)
apps/web/src/components/debugger/HexDump.tsx       (extend with highlight class)
apps/web/e2e/sprint-32-memory-changes.spec.ts
```

## Change Highlighting Contract

Rules:

- when a page is re-read after a step / host-call resume / state edit, compare against the previous cached page
- highlight only byte offsets whose values actually changed
- preserve optimistic local page edits in the current cache until the next invalidation
- changed bytes get a distinct highlight CSS class
- highlights clear on the next page read cycle

## Memory Reader Enhancement

Extend `useMemoryReader`:

- preserve the previous page snapshot after cache invalidation
- expose changed-byte offsets as a set for each page
- support optimistic local updates that persist until the next snapshot change

## E2E Tests

```
- stepping produces changed-byte highlights in affected memory pages
- editing a byte shows it highlighted on re-read
- highlights clear after the next step
- unchanged bytes are not highlighted
```

## Acceptance Criteria

- Changed bytes are highlighted after steps and edits.
- Only actually-changed offsets are highlighted.
- Optimistic edits are preserved in cache.
- Highlights clear on the next read cycle.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-32-memory-changes.spec.ts
```
