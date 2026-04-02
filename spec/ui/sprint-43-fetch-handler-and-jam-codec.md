# Sprint 43 — Fetch Handler, JAM Codec, and All-Ecalli

Status: Implemented

## Goal

Add a dedicated fetch host call handler with structured editing for all 16 GP 0.7.2 fetch variants. Build the JAM codec library for variable-length encoding. Add E2E tests using the all-ecalli example (added in Sprint 42).

## Prior Sprint Dependencies

- Sprint 42: host call UX redesign, auto-apply, register metadata, HostCallEffects interface, all-ecalli fixture
- Sprint 41: host-call editing and pending changes
- Sprint 20: host-call storage table

## What Works After This Sprint

### JAM Codec (`packages/types/src/jam-codec.ts`)

1. **VarU64 encode/decode.** Progressive prefix encoding matching GP Appendix A. Values 0-127 use 1 byte, up to 9 bytes for full u64. Implementation must use a generic loop algorithm (count leading 1-bits, mask lead byte, read trailing bytes LE), not per-width hardcoded branches — the loop form is shorter, more maintainable, and less prone to off-by-one errors.

2. **LE integer primitives.** `encodeU8/U16LE/U32LE/U64LE` and decode counterparts. All little-endian. Must use `DataView` with `bytes.byteOffset + offset` for decoding to correctly handle subarray views (a plain `bytes[offset]` approach is buggy when the Uint8Array is a slice of a larger ArrayBuffer).

3. **Variable-length containers.** `encodeBytesVarLen` (VarU64 length prefix + data), `encodeSequenceVarLen` (VarU64 count + items). `encodeSequenceVarLen` should accept a callback `(item: T) => Uint8Array` rather than a pre-encoded array to avoid intermediate allocation and prevent count/length mismatches. With corresponding decoders.

4. **33 unit tests** covering boundary values (0, 127, 128, 2^14, 2^21, 2^28, 2^32, 2^40, 2^48, 2^56, 2^63), roundtrips, and edge cases.

### Fetch Struct Codecs (`apps/web/src/lib/fetch-codec.ts`)

5. **All 16 fetch variant structs** with TypeScript interfaces, encode, and decode (best-effort, returns null on failure):
   - ProtocolConstants (134 bytes fixed, 33 fields)
   - WorkItemInfo (62 bytes fixed, 8 fields)
   - RefinementContext (variable: 4 hashes + timeslot + prerequisites list)
   - WorkPackage (variable: fully decoded — authToken, authServiceId, authCodeHash, authConfig, nested RefinementContext + WorkItem list). Must NOT punt context/workItems to opaque hex blobs.
   - WorkItem: serviceId (u32), codeHash (32B), payload (var-len), **two separate gas fields** `gasRefine` and `gasAccumulate` (both u64, matching GP spec), exportCount (var-u64), imports (ImportRef[]), extrinsics (ExtrinsicRef[])
   - ImportRef: uses `isWorkPackageHash` boolean discriminant (1-byte tag: 1=WP hash, 0=normal) + 32-byte hash + var-u64 index. Must NOT use a fixed 36-byte encoding that ignores the discriminant.
   - ExtrinsicRef: hash (32B) + VarU64 length (not fixed U32)
   - AuthorizerInfo (hash + config blob)
   - TransferOrOperand (union: Operand tag=0 or Transfer tag=1). Operand must include `resultBlob` (var-len, present when `resultKind === 0`) and `authOutput` (var-len).
   - Sequence wrappers for AllWorkItems and AllTransfersAndOperands

6. **FetchKind enum and FETCH_KIND_INFO** map with human-readable names **and descriptions** for all 16 variants. The description text is displayed in the fetch handler UI.

7. **Defaults** (`fetch-defaults.ts`) using small testnet values from pvm-debugger (2 cores, epoch=12, etc). Must provide defaults for **all editor types**: `DEFAULT_PROTOCOL_CONSTANTS`, `DEFAULT_WORK_ITEM_INFO`, `DEFAULT_REFINEMENT_CONTEXT`, `DEFAULT_AUTHORIZER_INFO`, `DEFAULT_OPERAND`, `DEFAULT_TRANSFER`, `DEFAULT_WORK_ITEM`, `DEFAULT_WORK_PACKAGE`.

8. **`computeFetchEffects` utility** (`fetch-utils.ts`). A pure function `computeFetchEffects(fullBlob, isNone, destAddr, offset, maxLen) → HostCallEffects` that implements the full fetch host call effect computation: slicing by offset/maxLen, computing ω₇ = totalLength (or NONE), and producing the memory write at destAddr. All fetch effect computation flows through this single function.

9. **`tryDecode` DRY helper.** A reusable decode wrapper that catches exceptions and returns `null | { value, bytesRead }`, avoiding repetitive try/catch in every decode function.

10. **Strict validation for fixed-size fields.** `encodeBytes32` must fail fast on wrong-length input. Transfer memo encoding must truncate to 128 bytes (not silently replace wrong-length with zeros, which masks bugs).

11. **14+ unit tests** covering size assertions, roundtrips, mixed-type sequences, and **WorkPackage encode/decode roundtrip** (verifying nested fields like `workItems.length`, `authServiceId`).

### Fetch Host Call Handler (`FetchHostCall.tsx` + `fetch/` sub-components)

12. **Three editing modes:**
    - **Trace**: Read-only display of trace memory write data. Available when resume proposal exists.
    - **Raw**: Hex textarea for the full response blob.
    - **Struct**: Per-variant structured field editors.

13. **Mode switching preserves data in all directions.** Struct→Raw copies the encoded hex. Raw→Struct decodes hex into struct fields (via `structInitialBlob`). Trace→Raw copies trace data. **Trace→Struct decodes trace data into struct fields.** All four transitions must carry data — never discard user work.

14. **Per-variant struct editors:**
    - ProtocolConstantsEditor: 33 fields in collapsible grouped sections (Balances, Gas, Capacity, Timing, Sizes), multi-column grid layout (2-3 columns).
    - WorkItemInfoEditor: 8 labeled fields.
    - RefinementContextEditor: 4 hash fields + timeslot + add/remove prerequisites list.
    - AuthorizerInfoEditor: hash + config hex blob (config uses `<textarea>` since blobs can be arbitrarily long).
    - TransferOrOperandEditor: tag switcher using string tags (`"operand"` / `"transfer"`, not numeric 0/1) with appropriate fields. Operand must expose `resultBlob` editor when `resultKind === 0`.
    - AllWorkItemsEditor / AllTransfersEditor: add/remove list editors.
    - WorkPackageEditor: all fields fully structured — authToken, authServiceId, authCodeHash, authConfig as individual editable fields, plus nested RefinementContext and WorkItem list.
    - BytesBlobEditor: simple hex for blob variants (kinds 2-6, 8-9, 13). Accepts `Uint8Array` directly (handles hex conversion internally). Supports `defaultSize` prop for contextual placeholder text (e.g., `"0x0000... (32 bytes)"`).
    - Entropy: fixed 32-byte hash editor (not arbitrary length).

15. **Kind description displayed.** The `kindInfo.description` text is shown at the top of the fetch handler, giving the user context about what the selected fetch kind does.

16. **NONE toggle for fetch** (index 1 added to `NONE_SUPPORTED`). When NONE is active, the **mode tabs and all editors are completely hidden** (not just disabled/grayed out).

17. **Slice preview** shows which portion of the full blob gets written to memory based on offset/maxLen. Includes a **visual progress bar** with colored segments: muted for the skipped prefix, blue for the written region. Shows **destination memory address** (e.g., `"to 0x{destAddr.toString(16)}"`). Text fallback: `"Slice: [start..end) of total bytes"`.

18. **Encoded output preview** in struct mode shows the hex encoding and byte count (read-only) below the editor. Must be visible within StructEditor itself (not only in the parent FetchHostCall wrapper).

19. **`traceTotalLength` from r7 proposal.** The total response length is extracted from the resume proposal's `registerWrites.get(7)` value (when not NONE), NOT from `traceData.length`. This is critical when the trace only wrote a slice of the full response. `traceData.length` is the slice length; r7 is the authoritative total.

20. **Partial response detection** (`TraceView`). Compares `traceData.length` against `traceTotalLength`. When they differ, displays `"(partial — full response was {totalLength}B)"`.

### StructEditor Architecture

21. **Centralized encoding with byte-change detection** (`StructEditor.tsx`). All variant state (constants, workItemInfo, refinementCtx, etc.) lives in a single StructEditor component. A centralized `useMemo` computes the encoded blob from the active variant's state. A `useEffect` with byte-comparison (`areBytesEqual`) notifies the parent `onBlobChange` only when the encoded output actually changes — preventing redundant re-renders and infinite update loops. Must NOT scatter `onChange` calls across per-variant wrappers with eslint-disable comments.

22. **`tryDecodeBlob` central dispatch.** A single function that decodes an initial blob for any FetchKind, dispatching to the appropriate variant decoder. Used when switching modes (Raw→Struct, Trace→Struct) and on initial mount with trace data.

23. **Fetch host call register metadata** added to `host-call-registers.ts`. Fetch handler (index 1) inputs include dest, offset, maxLen, kind. Kind register uses `format: "custom"` with `customValue` showing both numeric value and name (e.g., `"0 (Constants)"`). Param registers 11, 12 included.

### E2E Tests

24. **E2E test** (`sprint-43-fetch-host-call.spec.ts`). Playwright tests using the all-ecalli fixture (from Sprint 42), covering both refine and accumulate variants. Must:
    - Load the actual `all-ecalli-refine` and `all-ecalli-accumulate` examples (not generic `io-trace`).
    - Handle the SPI entrypoint config step (click `config-continue-button`).
    - Step to actual fetch host calls and verify the fetch handler UI appears (`data-testid="fetch-host-call"`).
    - Assert `host-call-empty` is NOT visible when fetch handler is shown.
    - Test Struct mode with editors and verify encoded output appears.
    - Test NONE toggle **hides** the Struct mode button (`not.toBeVisible()`).
    - Count fetch-specific badges in trace and assert `fetchCount > 0` (not tautological `>= 0`).
    - Use **unconditional assertions** (no `if (isFetch)` guards that silently pass when false).
    - Cover **both refine and accumulate contexts** (separate test sections).
    - Test auto-continue flow for accumulate example.

## Key Implementation Details

**ProtocolConstants encoding order** (134 bytes): `u64 u64 u64 u16 u32 u32 u64 u64 u64 u64 u16 u16 u16 u16 u32 u16 u16 u16 u16 u16 u16 u16 u16 u32 u32 u32 u32 u32 u32 u32 u32 u32 u32`. Field order matches `as-lan/sdk/jam/work-package.ts` `ProtocolConstantsCodec.encode()`. The `PROTOCOL_CONSTANTS_GROUPS` and `PROTOCOL_CONSTANTS_LABELS` in `fetch-codec.ts` define UI grouping and GP symbol labels (B_I, C, E, G_A, etc.).

**TransferOrOperand encoding**: Union with VarU64 tag byte. tag=0 (Operand): 4×bytes32 + varU64 gas + varU64 resultKind + [if resultKind==0: bytesVarLen resultBlob] + bytesVarLen authOutput. tag=1 (Transfer): u32 source + u32 dest + u64 amount + bytes128 memo + u64 gas.

**`BytesBlobEditor`** uses `editingRef` to prevent parent value syncs from clobbering user input. Calls `onChange` only on valid even-length hex or on blur — intermediate states like `0x` or odd-length hex don't trigger parent updates.

**StructEditor `initialBlob` prop** enables Raw→Struct and Trace→Struct mode switching. When set, attempts to decode the blob into struct fields via `tryDecodeBlob` dispatch. Uses byte-comparison ref to skip re-decoding the same bytes.

**`useStableCallback`** extended to FetchHostCall and StructEditor (builds on Sprint 42 which introduced the hook).

## Known Limitations / Future Work

- None currently identified. WorkPackage struct editor (kind 7) is fully structured with nested RefinementContext and WorkItem editing.

## Verification / Acceptance Criteria

### Unit Tests
- JAM codec: 33 tests — VarU64 boundary roundtrips, LE primitives, sequence containers
- Fetch codec: 14+ tests — size assertions, roundtrips, WorkPackage roundtrip, mixed TransferOrOperand sequences
- `computeFetchEffects`: NONE returns sentinel, non-NONE slices correctly, empty slice produces no memory write

### E2E Tests
- Load all-ecalli-refine → step to fetch host call → verify fetch handler shown
- Load all-ecalli-accumulate → verify accumulate context works
- Struct mode → fields editable → encoded output preview shown
- NONE toggle → mode tabs hidden, output register = 2^64-1
- Trace entries include fetch-specific badges (count > 0)

### Build
```bash
npm install && npm run build && npm test
cd apps/web && npx vite build
```

## Files Created

- `packages/types/src/jam-codec.ts` + `jam-codec.test.ts`
- `apps/web/src/lib/fetch-codec.ts` + `fetch-codec.test.ts`
- `apps/web/src/lib/fetch-defaults.ts`
- `apps/web/src/components/drawer/hostcalls/FetchHostCall.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/TraceView.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/RawEditor.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/StructEditor.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/SlicePreview.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/BytesBlobEditor.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/ProtocolConstantsEditor.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/WorkItemInfoEditor.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/RefinementContextEditor.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/AuthorizerInfoEditor.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/TransferOrOperandEditor.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/AllWorkItemsEditor.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/AllTransfersEditor.tsx`
- `apps/web/src/components/drawer/hostcalls/fetch/WorkPackageEditor.tsx`
- `apps/web/e2e/sprint-43-fetch-host-call.spec.ts`

## Files Modified

- `packages/types/src/index.ts` — re-export JAM codec
- `apps/web/src/lib/fetch-utils.ts` — add `computeFetchEffects` (file created in Sprint 42)
- `apps/web/src/components/drawer/HostCallTab.tsx` — add fetch case to handler switch, add index 1 to NONE_SUPPORTED
- `apps/web/src/components/drawer/hostcalls/host-call-registers.ts` — add fetch register metadata

## Edge Cases and Pitfalls

1. **VarU64 6/7-byte encoding lead byte payload bits.** The lead byte's payload bits encode the *highest* bits of the value (bits above what the trailing bytes cover), NOT the lowest bits of the high portion. For 6-byte encoding, lead_payload = `(v >> 40) & 0x03`, not `(v >> 32) & 0x03`. Getting this wrong causes incorrect roundtrips for values in the 2^32–2^40 range.

2. **DataView byteOffset for Uint8Array subarrays.** When decoding LE integers from a `Uint8Array` that is a `.subarray()` of a larger buffer, plain `bytes[offset]` indexing works but `new DataView(bytes.buffer)` does NOT — it sees the full underlying buffer. Must use `new DataView(bytes.buffer, bytes.byteOffset + offset, size)`.

3. **traceTotalLength vs traceData.length.** The trace memory write data may be a slice (offset + maxLen applied by the PVM). The authoritative total response length is in the r7 register write of the resume proposal, not `traceData.length`. Using the wrong value makes the slice preview and output register incorrect.

4. **StructEditor infinite update loops.** If each struct variant editor directly calls `onBlobChange` in a `useEffect`, circular updates can occur (parent re-renders → new props → child re-encodes → calls parent → ...). The fix is centralized encoding via `useMemo` with a byte-comparison guard in the `useEffect` that calls `onBlobChange`.

5. **`BytesBlobEditor` concurrent edit guard.** The `editingRef` prevents parent value updates from overwriting user mid-edit. Without this, typing `0x` and then another character would cause a feedback loop as the parent tries to sync the incomplete hex.

6. **WorkPackage decode must handle nested variable-length fields.** RefinementContext has a variable-length prerequisites list; each WorkItem has variable-length payload, imports, and extrinsics. Cannot split remaining bytes between "context blob" and "work items blob" — must decode sequentially.
