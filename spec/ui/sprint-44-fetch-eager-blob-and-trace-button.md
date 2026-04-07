# Sprint 44 — Fetch Eager Blob Initialization & "Use Trace Data" Gating

Status: Implemented

## Goal

Fix two issues in the fetch host call handler:

1. **"Use Trace Data" button shown without trace data.** The button appeared even when no resume proposal existed, confusing the user with a no-op action.
2. **Effects not applied on initial render in struct mode.** When a fetch host call started in struct mode (no trace data), the sidebar showed `ω₇ = 0` and no memory writes until the user toggled between Raw/Struct modes.

## Root Cause

The original `FetchHostCall` initialized `blob` from `traceData`, which is empty when there is no resume proposal. It relied on `StructEditor` to asynchronously report its encoded defaults via `onBlobChange` → `setBlob`. This created a **race condition**: the parent's blob effects `useEffect` fired with the stale empty blob before `StructEditor`'s encoded defaults propagated through React's state update cycle.

Multiple fix attempts using refs and state flags failed because React effects fire bottom-up (child before parent): `StructEditor`'s effect set the flag/ref synchronously, but the `setBlob` state update was still queued — so the parent's effect saw the flag as "ready" but still had the empty blob.

## Fix

### CRITICAL: Eager blob initialization — no async effect chains for initial state

`FetchHostCall` now computes the initial blob **synchronously during render** via `computeDefaultEncodedBlob(kind)` from `fetch-defaults.ts`. This eliminates the race entirely — `blob` is correct (e.g. 134 bytes for Constants) from render 1, and the blob effects `useEffect` reports correct effects on its first invocation.

**This pattern MUST be used for any host call handler that needs default data on mount.** Never rely on a child component's `useEffect` → `onBlobChange` → parent `setBlob` chain for initial state. Effects are asynchronous, state updates are batched, and React's bottom-up effect ordering makes parent-child coordination through effects inherently fragile.

The `computeDefaultEncodedBlob` function mirrors exactly the defaults that `StructEditor` uses in its `useState` initializers, ensuring the eager blob and `StructEditor`'s initial encoding are always in sync.

### "Use Trace Data" button gated on `hasProposal`

The `StickyBar` now receives a `hasProposal` prop. The button renders only when `userModified && hasProposal`, preventing it from appearing when there is no trace data to revert to.

## What Changed

### `apps/web/src/lib/fetch-defaults.ts`

- Added `computeDefaultEncodedBlob(kind: FetchKind): Uint8Array` — a pure function that encodes defaults for all 16 fetch kinds using the same default values as `StructEditor`'s `useState` initializers.
- Changed `import type` to value `import` for `FetchKind` and `encodeVariantData` (needed at runtime).

### `apps/web/src/components/drawer/hostcalls/FetchHostCall.tsx`

- Replaced `useState<Uint8Array>(traceData)` with `useState<Uint8Array>(initialBlob)` where `initialBlob = useMemo(() => hasProposal ? traceData : computeDefaultEncodedBlob(kind), ...)`.
- Removed all `effectsReady` / `structReady` workarounds — no longer needed.
- Removed `useRef` import (no longer used).
- The blob effects `useEffect` now fires unconditionally — the blob is always valid.

### `apps/web/src/components/drawer/HostCallTab.tsx`

- Added `hasProposal: boolean` prop to `StickyBar`.
- Changed "Use Trace Data" button guard from `userModified` to `userModified && hasProposal`.
- Passed `!!activeHostCall.resumeProposal` as `hasProposal` from parent.

## Edge Cases

1. **`computeDefaultEncodedBlob` must stay in sync with `StructEditor` defaults.** If a new `useState` default is added/changed in `StructEditor`, the corresponding case in `computeDefaultEncodedBlob` must be updated too. Both live in the same codebase and share the same default constants from `fetch-defaults.ts`, making drift unlikely.

2. **Blob-type kinds (2–6, 8–9, 13) produce empty default blobs.** This is correct — they represent arbitrary byte data with no meaningful default. The effects will report `ω₇ = 0` and no memory writes, which is the expected initial state.
