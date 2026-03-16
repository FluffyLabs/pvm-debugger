# Sprint 33 — Block Stepping (Real)

## Goal

Replace the temporary block-step placeholder (Sprint 16) with real basic-block-aware stepping. When the stepping mode is `Block`, the Step button and run loop advance to the next basic-block boundary using the disassembly-derived block map.

## What Works After This Sprint

- Block stepping advances to the end of the current basic block
- The step count is computed from the current PC to the block boundary
- Unknown PCs (outside any known block) fall back to `step(1)`
- Multi-PVM block stepping uses the smallest remaining block length across paused PVMs
- Run mode in block stepping recalculates the batch size on every iteration
- Breakpoints inside blocks still stop the run loop

## Prior Sprint Dependencies

- Sprint 16: Step button with stepping modes (block placeholder)
- Sprint 27: basic-block analysis

## Required Files

```
apps/web/src/hooks/useBlockStepping.ts
apps/web/src/hooks/useBlockStepping.test.ts
apps/web/src/hooks/useDebuggerActions.ts        (replace block placeholder)
apps/web/e2e/sprint-33-block-stepping.spec.ts
```

## Block Step Contract

`useBlockStepping` derives the step count for block mode:

- find the block containing the current `pc`
- count remaining instructions from current instruction to end of that block
- return `1` when the `pc` is outside every known block
- return `1` when there are no paused PVM snapshots
- when multiple PVMs are paused, use the smallest remaining length so no PVM overshoots

Implementation pitfall: block stepping follows actual control flow after execution. A branch at the end of the current block may land on a non-sequential block, so tests must not assume the next block header is always the destination.

## Debugger Actions Integration

`useDebuggerActions` routes step size through block stepping when mode is `block`:

- `Step` uses the computed block batch size
- the run loop recalculates on every iteration
- run mode still stops on breakpoints
- host-call resume handling remains unchanged

## Unit Tests

`useBlockStepping.test.ts` must cover:

- correct remaining count from mid-block
- unknown PCs fall back to 1
- multi-PVM uses smallest count

## E2E Tests

```
- block stepping advances past the current block boundary
- stepping from an unknown PC falls back to single step
- block stepping follows branch targets, not sequential block order
- run mode with block stepping stops on a breakpoint inside a block
```

## Acceptance Criteria

- Step button uses real block-boundary stepping in Block mode.
- Block-ending branches land on the branch target.
- Unknown PCs fall back to `step(1)`.
- Multi-PVM uses the shortest remaining block length.
- Run mode respects breakpoints inside blocks.
- Unit and E2E tests pass.
- `cd apps/web && npx vite build` succeeds.

## Verification

```bash
cd apps/web && npx vite build
npm test -- --project web
npx playwright test e2e/sprint-33-block-stepping.spec.ts
```
