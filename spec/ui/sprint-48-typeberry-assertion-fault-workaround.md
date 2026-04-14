# Sprint 48 — Typeberry Assertion Fault Workaround

Status: Implemented

## Goal

Fix the doom example (and any large program that accesses high memory addresses) producing different results between Typeberry and Ananas. Typeberry crashes with a JavaScript assertion error on programs that fault at high memory addresses, while Ananas correctly reports a `fault` status. Add a defensive workaround in the Typeberry adapter so both PVMs agree.

## Prior Sprint Dependencies

- Spec 005: runtime-worker and PVM adapters (defines the `SyncPvmInterpreter` contract and adapter responsibilities)
- Sprint 39: Ananas PVM support (Ananas adapter and dual-PVM execution)
- Sprint 25: divergence detection (UI depends on both PVMs agreeing on status)

## Root Cause

The bug is in `@typeberry/lib`'s `getStartPageIndex()` function in `memory/memory-utils.js`:

```javascript
// BUG: << converts result to signed 32-bit integer
export function getStartPageIndex(address) {
    return tryAsMemoryIndex((address >>> PAGE_SIZE_SHIFT) << PAGE_SIZE_SHIFT);
}
```

JavaScript's `<<` operator converts its result to a **signed 32-bit integer**. For page-aligned addresses at or above `0x80000000`, the result has bit 31 set, which makes the signed interpretation negative. `tryAsMemoryIndex` then rejects the negative value with an assertion error.

The sister function `getStartPageIndexFromPageNumber` in the same file correctly applies `>>> 0` to convert back to unsigned:

```javascript
// CORRECT: >>> 0 converts back to unsigned 32-bit
export function getStartPageIndexFromPageNumber(pageNumber) {
    return tryAsMemoryIndex((pageNumber << PAGE_SIZE_SHIFT) >>> 0);
}
```

### Trigger Sequence (doom example)

1. Doom's first instruction loads `r1 = 0xFFFFFFFFFFFFFFF8` (-8 as signed 64-bit).
2. The second instruction is `storeIndU64` using `r1` as a base address.
3. The computed store address (lower 32 bits: `0xFFFFFFF8` + immediate offset) targets unmapped memory.
4. `StoreOps.store()` correctly identifies the access as a fault.
5. In the **fault-handling code path** (not the address calculation), `getStartPageIndex(tryAsMemoryIndex(storeResult.error.address))` is called to compute the page index for the error report.
6. `getStartPageIndex` aligns the error address to a page boundary: `(0xFFFFF >>> 12) << 12` = `0xFFFFF000` as unsigned, but `-4096` as signed 32-bit.
7. `tryAsMemoryIndex(-4096)` throws `Assertion failure: Incorrect memory index: -4096!`.

### Impact

- **Ananas**: returns `status = 2 (fault)` — correct behavior per PVM spec.
- **Typeberry**: throws an unrecoverable JavaScript exception — the debugger marks the session as `"failed"` instead of `"terminated"`.
- The UI divergence panel shows different lifecycles rather than matching fault statuses.
- Any program that stores to an address in the upper half of the 32-bit address space (>= 0x80000000) and faults will trigger this bug.

## What Works After This Sprint

### 1. Typeberry Assertion Fault Recovery

`TypeberrySyncInterpreter.step()` catches assertion errors thrown by the Typeberry library during execution. When an assertion failure is caught:

- The interpreter records a synthetic fault status (`TYPEBERRY_STATUS_FAULT = 2`).
- `step()` returns `{ finished: true }` instead of propagating the exception.
- `getStatus()` returns the synthetic fault code (2) instead of the stale ok code (255).

This only catches errors whose message includes `"Assertion failure"` — all other errors propagate normally.

### 2. Status Override Lifecycle

The synthetic fault status is stored in a private `assertionFaultStatus` field:

- Set to `TYPEBERRY_STATUS_FAULT` when an assertion error is caught during `step()`.
- Cleared to `null` on `load()` and `reset()`, restoring normal `getStatus()` delegation to the underlying adapter.
- `getStatus()` checks `assertionFaultStatus` first; if non-null, returns it instead of querying the adapter.

### 3. Both PVMs Agree on Doom Execution

After loading the doom binary with default initial state (pc=0, gas=1M, no page map):

- **Step 1**: Both PVMs execute successfully. PC=3, Gas=999999, r1=0xFFFFFFFFFFFFFFF8.
- **Step 2**: Both PVMs report `fault` status and `finished=true`. The program terminates because the `storeIndU64` targets unmapped memory.
- No JavaScript exceptions escape from either adapter.

## Files Changed

| File | Changes |
|------|---------|
| `packages/runtime-worker/src/adapters/typeberry.ts` | Added `assertionFaultStatus` field, try/catch in `step()`, status override in `getStatus()`, clearing in `load()` and `reset()` |
| `packages/runtime-worker/src/index.test.ts` | Added "Doom program: Typeberry vs Ananas" test suite (5 tests): initial state match, 1-step match, fault agreement, nSteps graceful handling, reset clears fault status |

## Implementation Notes

- The workaround is scoped to assertion errors only. If Typeberry throws a non-assertion error (e.g. out of memory, invalid program), it propagates normally.
- The doom binary loaded as `generic_pvm` with no page map will always fault on step 2 because there are no writable memory pages. To actually run doom, the content pipeline would need to extract or provide appropriate page maps. This sprint does not change the loading behavior — it only ensures both PVMs agree on the fault outcome.
- This is a workaround for an upstream bug in `@typeberry/lib`. The fix in the library itself would be a one-character change: adding `>>> 0` in `getStartPageIndex()`. Consider reporting upstream and removing the workaround when a fixed version is published.

## Acceptance Criteria

- Typeberry does not throw JavaScript exceptions when stepping the doom binary.
- Both PVMs report `fault` status after doom's second instruction.
- Both PVMs report identical PC, gas, status, and registers after loading doom with default state.
- Both PVMs report identical PC, gas, status, and registers after 1 step of doom.
- `TypeberrySyncInterpreter.step(100)` on doom returns `{ finished: true }` without throwing.
- `mapStatus(typeberry.getStatus())` returns `"fault"` after the assertion recovery.
- `reset()` clears the assertion fault status; `getStatus()` returns `"ok"` (255) after reset.
- All 55 pre-existing runtime-worker tests continue to pass.
- Full workspace test suite (683 tests across 28 files) passes.

## Verification

```bash
npm run build -w packages/runtime-worker
npm test -w packages/runtime-worker
npm run build
npm test
```
