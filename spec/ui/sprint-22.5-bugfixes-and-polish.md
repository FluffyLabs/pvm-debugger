# Sprint 22.5 — Bugfixes and Dev-Mode Polish

Status: Implemented

## Goal

Fix critical bugs preventing the debugger from working correctly in dev mode and with generic PVM example programs. Eliminate layout scrolling issues and React 19 dev-mode crashes.

## What Works After This Sprint

- Dev mode (`npm run dev`) runs without errors or crashes
- All generic PVM examples (Add, Fibonacci, Game of Life, Branch, Store U16) load and display correct instruction mnemonics
- The debugger viewport is fully constrained — no page-level scrolling; header stays at top, drawer tabs at bottom, panels scroll independently
- Running programs (e.g. Game of Life) no longer triggers React "Maximum update depth exceeded" errors
- Memory panel does not flash "Loading…" on every step — stale data stays visible during re-fetch
- Settings tab uses a 3-column layout

## Changes

### 1. Fix generic PVM fixture files

The `.pvm` fixture files under `fixtures/generic/` contained incorrect bytes that did not match the reference implementation. For example, `add.pvm` was 3 wrong bytes instead of the correct 7-byte PVM blob, `game-of-life.pvm` was a single byte instead of 386.

**Root cause:** Spec-004 commit (`cf29eea`) generated placeholder fixture files with wrong data.

**Fix:** Regenerated all `.pvm` files from the reference `examplePrograms.ts` blob data:
- `add.pvm`: 3 → 7 bytes (opcode 200 = `add_64`)
- `fibonacci.pvm`: 7 → 41 bytes (33 bytes of code, 15 instructions)
- `game-of-life.pvm`: 1 → 386 bytes (339 bytes of code)
- `branch.pvm`: 3 → 21 bytes
- `store-u16.pvm`: 6 → 9 bytes

### 2. Detect PVM blobs in decodeGeneric

`decodeGeneric()` always wrapped input bytes with `encodePvmBlob()`, which double-wrapped files that were already valid blobs. The instruction mask was lost, causing all instructions except the first to be invisible.

**Fix:** `decodeGeneric()` now tries `ProgramDecoder.deblob()` first. If the input is already a valid blob, it is used as-is. Raw instruction bytes still fall back to `encodePvmBlob()` wrapping.

**Files:** `packages/content/src/decode-generic.ts`

### 3. Fix Button variant type errors

`@fluffylabs/shared-ui` Button component no longer has a `"outline"` variant (only `"primary"`, `"secondary"`, `"tertiary"`, `"ghost"`). Badge still accepts `"outline"`.

**Fix:** Changed `variant="outline"` to `variant="secondary"` on all Button components. Badge components left unchanged.

**Files:** `ConfigStep.tsx`, `ExampleList.tsx`, `LoadPage.tsx`

### 4. Fix manifest type mismatch

Importing `examples.json` with `resolveJsonModule` infers `entrypoint.type` as `string`, not the required union `"accumulate" | "refine" | "is_authorized"`.

**Fix:** Loosened `initManifest()` parameter type to accept raw JSON data and cast internally.

**Files:** `packages/content/src/examples-manifest.ts`

### 5. Fix orchestrator null safety

`orchestrator.getPageMap()` in DebuggerPage was called without null check.

**Fix:** Added optional chaining: `orchestrator?.getPageMap() ?? []`.

**Files:** `apps/web/src/pages/DebuggerPage.tsx`

### 6. Fix viewport layout scrolling

`.app-shell`, `body`, and `#root` all used `min-height: 100vh`, allowing content to grow beyond the viewport and cause page-level scrolling.

**Fix:** Changed to `height: 100vh` with `overflow: hidden` on all three elements. The debugger layout chain is now fully constrained to the viewport.

**Files:** `apps/web/src/styles/global.css`, `apps/web/src/styles/layout.css`

### 7. Fix React 19 dev-mode BigInt serialization crash

React 19 development mode calls `JSON.stringify` on component props for render logging. BigInt values (registers, gas) are not JSON-serializable, causing an uncaught TypeError that crashes the renderer.

**Fix:** Added `BigInt.prototype.toJSON` in the app entry point. Production builds are unaffected.

**Files:** `apps/web/src/main.tsx`

### 8. Fix memory panel "Loading…" flash

`useMemoryReader` cleared its entire cache on every `snapshotVersion` change, causing expanded pages to briefly show "Loading…" before the re-fetch completed.

**Fix:** Replaced cache-clearing with a versioned entry system. Stale data remains visible while fresh data loads in the background. Moved mutable state into refs so callback identities are stable (preventing re-render loops).

**Files:** `apps/web/src/hooks/useMemoryReader.ts`, `apps/web/src/components/debugger/MemoryRange.tsx`

### 9. Fix "Maximum update depth exceeded" during Run

Two sources of infinite/excessive React state updates during continuous execution:

**a) `useOrchestratorState`:** Every step event called 4 `setState` calls synchronously. During Run (100 steps/batch), this overwhelmed React's update depth limit.

**Fix:** Event handlers now buffer updates into refs and coalesce into a single `requestAnimationFrame` flush per frame.

**b) `useMemoryReader`:** `expandPage` callback depended on `cache` state, causing unstable identity → `useEffect` in `MemoryRange` re-fired → fetch → cache update → loop.

**Fix:** All callbacks use refs internally, giving them stable identity across renders.

**Files:** `apps/web/src/hooks/useOrchestratorState.ts`, `apps/web/src/hooks/useMemoryReader.ts`

### 10. Settings tab 3-column layout

Changed settings tab from vertical stack with dividers to a 3-column CSS grid.

**Files:** `apps/web/src/components/drawer/SettingsTab.tsx`

## Test adjustments

- `sprint-06-memory.spec.ts`: Updated "expanded hex dump remains visible after stepping" test to step twice (the corrected `store-u16` blob executes successfully on the first step; terminal state requires a second step past code end).
