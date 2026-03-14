# UI-014 - Block Stepping Integration

## Purpose

Replace the temporary block-step fallback with real basic-block-aware stepping.

The existing `Step` button remains the only manual affordance. When the debugger stepping mode is set to `Block`, manual stepping and the run loop must advance to the next basic-block boundary using the disassembly-derived block map.

## Required Files

```
apps/web/src/hooks/useBlockStepping.ts
apps/web/src/hooks/useBlockStepping.test.ts
apps/web/src/hooks/useDebuggerActions.ts
apps/web/e2e/block-stepping.spec.ts
```

## Block Step Contract

`useBlockStepping` derives the current program envelope from the orchestrator, disassembles it, groups instructions into basic blocks, and exposes the computed batch size for block stepping.

Rules:

- find the block that contains the current `pc`
- count the remaining instructions from the current instruction through the end of that block
- return `1` when the `pc` is outside every known block
- return `1` when there are no paused PVM snapshots to inspect
- when multiple PVMs are paused, use the smallest remaining block length so no PVM overshoots its current boundary

Implementation pitfall:

- block stepping follows actual control flow after the batch executes. A branch at the end of the current block may land on a non-sequential block start, so browser tests must not assume the next rendered block header is always the destination.

## Debugger Actions Contract

`useDebuggerActions` must route the configured step size through block stepping whenever the stepping mode is `block`.

Rules:

- `Step` uses the computed block batch size
- the run loop recalculates the block batch size on every iteration
- run mode still stops immediately when any stepped report hits a breakpoint
- host-call resume handling remains unchanged: pending host calls are resolved before the block step is issued

## UX Contract

The execution controls stay the same, but the `Step` tooltip / accessible label must describe block stepping correctly.

Rules:

- `Instruction` -> `Step 1 instruction`
- `Block` -> `Step to block boundary`
- `N-Instructions` -> `Step N instructions`

## Testing Requirements

Coverage must prove:

- the block-step helper counts remaining instructions correctly
- unknown PCs fall back to a single instruction
- multi-PVM block stepping uses the smallest paused remaining count
- block stepping follows the executed branch target rather than assuming sequential block order
- stepping from a PC beyond the known block map falls back to a single instruction
- run mode in block stepping still stops on a breakpoint inside the active block

## Acceptance Criteria

- The `Step` button uses real block-boundary stepping when the stepping mode is `Block`.
- Manual block stepping advances to the next boundary of the currently executing basic block.
- A block-ending branch lands on the branch target block as dictated by execution, not by visual block order.
- PCs outside the basic-block map fall back to `step(1)`.
- Multi-PVM block stepping uses the shortest remaining paused block length.
- Run mode with block stepping respects breakpoints inside a block.
- `npm run build -w @pvmdbg/web` succeeds.
- `npm test -- --project web` succeeds.
- `cd apps/web && npx playwright test e2e/block-stepping.spec.ts` succeeds.

## Verification

```bash
npm run build -w @pvmdbg/web
npm test -- --project web
cd apps/web && npx playwright test e2e/block-stepping.spec.ts
```
