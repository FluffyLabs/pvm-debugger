# Sprint 27 — Instructions — Block Folding + Virtualization

Status: Implemented

## Goal

Group instructions into basic blocks with collapsible headers and add `@tanstack/react-virtual` so large programs stay performant. This sprint transforms the flat instruction list into a structured, scalable view.

## What Works After This Sprint

- Instructions are grouped under `Block N` headers
- Clicking a block header collapses/expands that block's instructions
- Collapsed blocks hide instruction rows but keep the header visible
- Large programs use virtualization — DOM row count stays bounded
- Overscan buffer prevents visible blank areas during scrolling

## Prior Sprint Dependencies

- Sprint 03: flat instruction list
- Sprint 26: breakpoints (row structure)

## Required Files

```
apps/web/src/hooks/useBasicBlocks.ts
apps/web/src/components/debugger/InstructionsPanel.tsx  (extend)
apps/web/e2e/sprint-27-blocks-virtual.spec.ts
```

## Basic Block Contract

`useBasicBlocks` groups decoded instructions into ordered basic blocks and tracks collapsed state.

Each block exposes:

- `index`
- `startPc`
- `endPc`
- `instructions`
- `isCollapsed`

Rules:

- a block begins at program start and at each boundary from the decoder/basic-block analysis
- each block renders a header row labeled `Block N`
- clicking the header toggles collapse/expand for that block only
- collapsed blocks hide instruction rows but keep the header visible

## Virtualization Contract

Use `@tanstack/react-virtual`.

Rules:

- only visible rows plus a modest overscan buffer are mounted
- block headers and instruction rows may use different estimated heights
- large programs must not render the full instruction list into the DOM
- the scroll container must have a constrained height from the debugger layout

Implementation pitfall: if the debugger shell grows with content instead of being height-constrained, the virtualizer sees the full list height and mounts every row. The height constraint must come from the layout (Sprint 07), not from inside the panel.

## E2E Tests

```
- block headers are visible and labeled "Block N"
- clicking a block header collapses its instructions
- clicking again expands them
- a large program fixture keeps DOM row count bounded (check mounted element count)
```

## Acceptance Criteria

- Instructions are grouped under collapsible block headers.
- Collapsed blocks hide instructions but keep headers visible.
- Large programs are virtualized with bounded DOM row count.
- Existing features (current-PC highlight, breakpoints) still work.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-27-blocks-virtual.spec.ts
```

## Implementation Notes

- `useBasicBlocks` auto-expands any collapsed block that contains the current PC, so the user always sees the active instruction.
- The virtualizer uses `overscan: 15` and different estimated heights for headers (28px) vs instruction rows (24px).
- Block grouping reuses the `blockIndex` field already computed in `useDisassembly` via `@typeberry/lib`'s `BasicBlocks` class — no duplicate block analysis.
- A new `BlockHeader` component (`apps/web/src/components/debugger/BlockHeader.tsx`) renders the collapsible header with chevron icons and instruction count.
- Scroll-to-current-PC uses `virtualizer.scrollToIndex()` instead of the previous `scrollIntoView` ref approach.
- E2E tests also verify no regressions in sprint-03 (flat list rendering) and sprint-26 (breakpoints).
