# Sprint 43 — Fetch Handler, JAM Codec, and All-Ecalli

Status: Implemented

**GP Reference:** [graypaper-ab2cdbd](https://gp.fluffylabs.dev/graypaper-ab2cdbd5b070ba2176e8dd830b06401ce05a954d.md) (§B.5 `fetch` = 1, lines 3644–3711; Appendix D encoding §4454–4523)

## Goal

Add a dedicated fetch host call handler with structured editing for all 16 fetch variants as defined in the target GP revision. Build the JAM codec library for variable-length encoding. Add E2E tests using the all-ecalli example (added in Sprint 42).

## Prior Sprint Dependencies

- Sprint 42: host call UX redesign, auto-apply, register metadata, HostCallEffects interface, all-ecalli fixture
- Sprint 41: host-call editing and pending changes
- Sprint 20: host-call storage table

## Fetch Host Call Register Layout (GP §B.5, `fetch` = 1)

The fetch host call uses these registers (per GP lines 3703–3710):

| Register | Role | GP variable | Notes |
|----------|------|-------------|-------|
| **ω₇** | **dest** (output memory address) | `o = ω₇` | Where fetched data is written |
| **ω₈** | **offset** | `f = min(ω₈, \|v\|)` | Offset into the full response blob |
| **ω₉** | **maxLen** | `l = min(ω₉, \|v\| - f)` | Maximum bytes to write |
| **ω₁₀** | **kind** (variant selector) | Branch in v = cases{...} | Selects which data to fetch (0–15) |
| **ω₁₁** | **param1** | Secondary index | Used by kinds 3–6, 12–13, 15 |
| **ω₁₂** | **param2** | Tertiary index | Used by kinds 3, 5 |

**Output:** ω₇′ = |v| (total response length) on success, or NONE (2^64−1) if v = ⊥.

## Fetch Kind Enum (GP lines 3647–3701)

| ω₁₀ | Name | GP data | Availability |
|------|------|---------|-------------|
| 0 | Constants | c (134-byte protocol constants encoding) | All contexts |
| 1 | Entropy | n (2nd param: entropy hash in accumulate, zero hash in refine, ⊥ in is-auth) | Context-dependent |
| 2 | AuthorizerTrace | r (authorizer output trace) | Refine only |
| 3 | OtherWorkItemExtrinsics | x̄[ω₁₁]_{ω₁₂} | Refine only |
| 4 | MyExtrinsics | x̄ᵢ_{ω₁₁} (current work item's extrinsic at index ω₁₁) | Refine only |
| 5 | OtherWorkItemImports | ī[ω₁₁]_{ω₁₂} | Refine only |
| 6 | MyImports | īᵢ_{ω₁₁} (current work item's import at index ω₁₁) | Refine only |
| 7 | WorkPackage | encode(p) (full encoded work package) | Refine + is-auth |
| 8 | Authorizer | p.authconfig (authorization configuration blob) | Refine + is-auth |
| 9 | AuthorizationToken | p.authtoken (authorization token blob) | Refine + is-auth |
| 10 | RefineContext | encode(p.context) (encoded work-package context) | Refine + is-auth |
| 11 | AllWorkItems | encode(var(⟨S(w) : w in p.workitems⟩)) (all item summaries) | Refine + is-auth |
| 12 | OneWorkItem | S(p.workitems[ω₁₁]) (one item summary, 62 bytes) | Refine + is-auth |
| 13 | WorkItemPayload | p.workitems[ω₁₁].payload | Refine + is-auth |
| 14 | AllTransfersAndOperands | encode(var(i)) (all accumulation inputs) | Accumulate only |
| 15 | OneTransferOrOperand | encode(i[ω₁₁]) (one accumulation input) | Accumulate only |

## What Works After This Sprint

### JAM Codec (`packages/types/src/jam-codec.ts`)

1. **VarU64 encode/decode.** Progressive prefix encoding matching GP Appendix A. Values 0-127 use 1 byte, up to 9 bytes for full u64. Implementation must use a generic loop algorithm (count leading 1-bits, mask lead byte, read trailing bytes LE), not per-width hardcoded branches — the loop form is shorter, more maintainable, and less prone to off-by-one errors.

2. **LE integer primitives.** `encodeU8/U16LE/U32LE/U64LE` and decode counterparts. All little-endian. Must use `DataView` with `bytes.byteOffset + offset` for decoding to correctly handle subarray views (a plain `bytes[offset]` approach is buggy when the Uint8Array is a slice of a larger ArrayBuffer).

3. **Fixed-size hash helpers.** `encodeBytes32`/`decodeBytes32` for 32-byte hashes. Exported from `jam-codec.ts` for shared use.

4. **Variable-length containers.** `encodeBytesVarLen` (VarU64 length prefix + data), `encodeSequenceVarLen` (VarU64 count + items). `encodeSequenceVarLen` should accept a callback `(item: T) => Uint8Array` rather than a pre-encoded array to avoid intermediate allocation and prevent count/length mismatches. With corresponding decoders.

5. **33 unit tests** covering boundary values (0, 127, 128, 2^14, 2^21, 2^28, 2^32, 2^40, 2^48, 2^56, 2^63), roundtrips, and edge cases.

### Fetch Struct Codecs (`apps/web/src/lib/fetch-codec.ts`)

6. **All 16 fetch variant structs** with TypeScript interfaces, encode, and decode (best-effort, returns null on failure). Encoding must match the GP Appendix D serialization rules.

   **Kind 0 — ProtocolConstants** (134 bytes fixed, 33 fields). Encoding order per GP lines 3650–3682:

   | # | GP Symbol | Field name | Size | GP constant |
   |---|-----------|------------|------|-------------|
   | 1 | B_I | electiveItemBalance | u64 | Citemdeposit |
   | 2 | B_L | electiveByteBalance | u64 | Cbytedeposit |
   | 3 | B_S | baseServiceBalance | u64 | Cbasedeposit |
   | 4 | C | coreCount | u16 | Ccorecount |
   | 5 | D | preimageExpungePeriod | u32 | Cexpungeperiod |
   | 6 | E | epochLength | u32 | Cepochlen |
   | 7 | G_A | gasAccumulateReport | u64 | Creportaccgas |
   | 8 | G_I | gasIsAuthorized | u64 | Cpackageauthgas |
   | 9 | G_R | gasMaxRefine | u64 | Cpackagerefgas |
   | 10 | G_T | gasMaxBlock | u64 | Cblockaccgas |
   | 11 | H | recentHistoryLength | u16 | Crecenthistorylen |
   | 12 | I | maxWorkItems | u16 | Cmaxpackageitems |
   | 13 | J | maxReportDeps | u16 | Cmaxreportdeps |
   | 14 | K | maxTicketsPerExtrinsic | u16 | Cmaxblocktickets |
   | 15 | L | maxLookupAnchorAge | u32 | Cmaxlookupanchorage |
   | 16 | N | ticketsPerValidator | u16 | Cticketentries |
   | 17 | O | maxAuthorizersPerCore | u16 | Cauthpoolsize |
   | 18 | P | slotDuration | u16 | Cslotseconds |
   | 19 | Q | authorizersQueueSize | u16 | Cauthqueuesize |
   | 20 | R | rotationPeriod | u16 | Crotationperiod |
   | 21 | T | maxExtrinsicsPerWorkItem | u16 | Cmaxpackagexts |
   | 22 | U | reportTimeoutGracePeriod | u16 | Cassurancetimeoutperiod |
   | 23 | V | validatorsCount | u16 | Cvalcount |
   | 24 | W_A | maxAuthorizerCodeSize | u32 | Cmaxauthcodesize |
   | 25 | W_B | maxBundleSize | u32 | Cmaxbundlesize |
   | 26 | W_C | maxServiceCodeSize | u32 | Cmaxservicecodesize |
   | 27 | W_E | erasureCodedPieceSize | u32 | Cecpiecesize |
   | 28 | W_M | maxImportSegments | u32 | Cmaxpackageimports |
   | 29 | W_P | ecPiecesPerSegment | u32 | Csegmentecpieces |
   | 30 | W_R | maxWorkReportSize | u32 | Cmaxreportvarsize |
   | 31 | W_T | transferMemoSize | u32 | Cmemosize |
   | 32 | W_X | maxExportSegments | u32 | Cmaxpackageexports |
   | 33 | Y | contestLength | u32 | Cepochtailstart |

   **Kind 1 — Entropy/ServiceCode**: 32-byte hash (context-dependent: entropy hash in accumulate, zero hash in refine).

   **Kind 2–6, 8–9, 13 — Blob variants**: Raw byte blobs. Use BytesBlobEditor.

   **Kind 7 — WorkPackage** (variable, GP line 4454–4461). Fully decoded struct:
   - authcodehost: u32 (service ID)
   - authcodehash: 32 bytes (hash)
   - context: WorkContext (see below)
   - authtoken: var-len blob
   - authconfig: var-len blob
   - workitems: var-len sequence of WorkItem

   **WorkContext / RefinementContext** (GP line 4411–4418):
   - anchorhash: 32 bytes
   - anchorpoststate: 32 bytes
   - anchoraccoutlog: 32 bytes
   - lookupanchorhash: 32 bytes
   - lookupanchortime: u32 (timeslot)
   - prerequisites: var-len sequence of 32-byte hashes

   **WorkItem** (GP line 4463–4476):
   - serviceindex: u32
   - codehash: 32 bytes
   - refgaslimit: u64
   - accgaslimit: u64
   - exportcount: **u16** (encode[2], NOT VarU64)
   - payload: var-len blob
   - importsegments: var-len sequence of I#-encoded imports
   - extrinsics: var-len sequence of (hash(32B) + **u32** length)

   **ImportRef encoding** (GP line 4517–4523, function I#):
   - 32-byte hash + **u16 index** where the **high bit** of the u16 discriminates normal (0) vs. work-package hash (1).
   - Encoding: `{hash, encode[2]{i}}` when normal; `{hash, encode[2]{i + 2^15}}` when WP hash.
   - Total: 34 bytes per import. NOT a 1-byte tag + hash + VarU64 scheme.

   **ExtrinsicRef encoding** (GP line 4472–4475): hash (32B) + **u32** length (encode[4]). Total: 36 bytes. NOT hash + VarU64.

   **Kind 10 — RefineContext**: encoded WorkContext (see above).

   **Kind 11 — AllWorkItems**: `encode(var(⟨S(w) : w in workitems⟩))` — VarU64-counted sequence of work item summaries.

   **Kind 12 — OneWorkItem** (WorkItemSummary, GP line 3697, 62 bytes fixed):
   - S(w) = encode{ encode[4]{serviceindex}, codehash(32B), encode[8]{refgaslimit, accgaslimit}, encode[2]{exportcount, |importsegments|, |extrinsics|}, encode[4]{|payload|} }
   - = u32 + 32B + u64 + u64 + u16 + u16 + u16 + u32 = 62 bytes

   **Kind 14 — AllTransfersAndOperands**: `encode(var(i))` — VarU64-counted sequence of accumulation inputs.

   **Kind 15 — OneTransferOrOperand** (GP lines 4501–4514). Union with 1-byte tag:
   - tag=0 (Operand, encode[U]): packagehash(32B) + segroot(32B) + authorizer(32B) + payloadhash(32B) + gaslimit(u64) + O(result) + var{authtrace}
     - O(result): tag byte (0=blob with var-len data, 1=∞/OOG, 2=panic, 3=badexports, 4=oversize, 5=BAD, 6=BIG)
   - tag=1 (Transfer, encode[X]): source(u32) + dest(u32) + amount(u64) + memo(128 bytes fixed) + gas(u64)

   **Kind 8 — Authorizer**: p.authconfig blob (authorizer configuration).

   **Kind 9 — AuthorizationToken**: p.authtoken blob.

7. **FetchKind enum and FETCH_KIND_INFO** map with human-readable names **and descriptions** for all 16 variants matching the table above. The description text is displayed in the fetch handler UI.

8. **Defaults** (`fetch-defaults.ts`) using small testnet values from pvm-debugger (2 cores, epoch=12, etc). Must provide defaults for **all editor types**: `DEFAULT_PROTOCOL_CONSTANTS`, `DEFAULT_WORK_ITEM_SUMMARY`, `DEFAULT_REFINEMENT_CONTEXT`, `DEFAULT_AUTHORIZER_INFO`, `DEFAULT_OPERAND`, `DEFAULT_TRANSFER`, `DEFAULT_WORK_ITEM`, `DEFAULT_WORK_PACKAGE`.

9. **`computeFetchEffects` utility** (`fetch-utils.ts`). A pure function `computeFetchEffects(fullBlob, isNone, destAddr, offset, maxLen) → HostCallEffects` that implements the full fetch host call effect computation: slicing by offset/maxLen, computing ω₇ = totalLength (or NONE), and producing the memory write at destAddr. All fetch effect computation flows through this single function.

10. **`tryDecode` DRY helper.** A reusable decode wrapper that catches exceptions and returns `null | { value, bytesRead }`, avoiding repetitive try/catch in every decode function.

11. **Strict validation for fixed-size fields.** `encodeBytes32` must fail fast on wrong-length input. Transfer memo encoding must truncate to 128 bytes (not silently replace wrong-length with zeros, which masks bugs).

12. **14+ unit tests** covering size assertions, roundtrips, mixed-type sequences, and **WorkPackage encode/decode roundtrip** (verifying nested fields like `workItems.length`, `authcodehost`).

### Fetch Host Call Handler (`FetchHostCall.tsx` + `fetch/` sub-components)

13. **Three editing modes:**
    - **Trace**: Read-only display of trace memory write data. Available when resume proposal exists.
    - **Raw**: Hex textarea for the full response blob.
    - **Struct**: Per-variant structured field editors.

14. **Mode switching preserves data in all directions.** Struct→Raw copies the encoded hex. Raw→Struct decodes hex into struct fields (via `structInitialBlob`). Trace→Raw copies trace data. **Trace→Struct decodes trace data into struct fields.** All four transitions must carry data — never discard user work.

15. **Per-variant struct editors:**
    - ProtocolConstantsEditor: 33 fields in collapsible grouped sections (Balances, Gas, Capacity, Timing, Sizes), multi-column grid layout (2-3 columns). Field names and symbols per the table above.
    - WorkItemSummaryEditor: 8 labeled fields (62 bytes, read from kind=12).
    - RefinementContextEditor: 4 hash fields (anchorhash, anchorpoststate, anchoraccoutlog, lookupanchorhash) + u32 timeslot + add/remove prerequisites list.
    - AuthorizerInfoEditor: authconfig blob (textarea for arbitrary-length blobs).
    - TransferOrOperandEditor: tag switcher using string tags (`"operand"` / `"transfer"`, not numeric 0/1) with appropriate fields. Operand must expose O(result) with result kind selector and optional resultBlob editor when resultKind === 0, plus authtrace var-len blob.
    - AllWorkItemsEditor / AllTransfersEditor: add/remove list editors.
    - WorkPackageEditor: all fields fully structured — authcodehost (u32), authcodehash (32B), context (nested RefinementContextEditor), authtoken (var-len blob), authconfig (var-len blob), workitems (nested WorkItem list).
    - BytesBlobEditor: simple hex for blob variants (kinds 2–6, 8–9, 13). Accepts `Uint8Array` directly (handles hex conversion internally). Supports `defaultSize` prop for contextual placeholder text (e.g., `"0x0000... (32 bytes)"`).
    - Entropy (kind 1): fixed 32-byte hash editor (not arbitrary length).

16. **Kind description displayed.** The `kindInfo.description` text is shown at the top of the fetch handler, giving the user context about what the selected fetch kind does.

17. **NONE toggle for fetch** (index 1 added to `NONE_SUPPORTED`). When NONE is active, the **mode tabs and all editors are completely hidden** (not just disabled/grayed out).

18. **Slice preview** shows which portion of the full blob gets written to memory based on offset/maxLen. Includes a **visual progress bar** with colored segments: muted for the skipped prefix, blue for the written region. Shows **destination memory address** (e.g., `"to 0x{destAddr.toString(16)}"`). Text fallback: `"Slice: [start..end) of total bytes"`.

19. **Encoded output preview** in struct mode shows the hex encoding and byte count (read-only) below the editor. Must be visible within StructEditor itself (not only in the parent FetchHostCall wrapper).

20. **`traceTotalLength` from r7 proposal.** The total response length is extracted from the resume proposal's `registerWrites.get(7)` value (when not NONE), NOT from `traceData.length`. This is critical when the trace only wrote a slice of the full response. `traceData.length` is the slice length; r7 is the authoritative total.

21. **Partial response detection** (`TraceView`). Compares `traceData.length` against `traceTotalLength`. When they differ, displays `"(partial — full response was {totalLength}B)"`.

### StructEditor Architecture

22. **Centralized encoding with byte-change detection** (`StructEditor.tsx`). All variant state (constants, refinementCtx, etc.) lives in a single StructEditor component. A centralized `useMemo` computes the encoded blob from the active variant's state. A `useEffect` with byte-comparison (`areBytesEqual`) notifies the parent `onBlobChange` only when the encoded output actually changes — preventing redundant re-renders and infinite update loops. Must NOT scatter `onChange` calls across per-variant wrappers with eslint-disable comments.

23. **`tryDecodeBlob` central dispatch.** A single function that decodes an initial blob for any FetchKind, dispatching to the appropriate variant decoder. Used when switching modes (Raw→Struct, Trace→Struct) and on initial mount with trace data.

24. **Fetch host call register metadata** added to `host-call-registers.ts`. Fetch handler (index 1) inputs: ω₇=dest (hex), ω₈=offset (decimal), ω₉=maxLen (decimal), ω₁₀=kind (custom: shows number + name e.g. `"0 (Constants)"`), ω₁₁=param1 (decimal), ω₁₂=param2 (decimal). Output: ω₇′ = total length or NONE.

### E2E Tests

25. **E2E test** (`sprint-43-fetch-host-call.spec.ts`). Playwright tests using the all-ecalli fixture (from Sprint 42), covering both refine and accumulate variants. Must:
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

**ProtocolConstants encoding order** (134 bytes): `u64 u64 u64 u16 u32 u32 u64 u64 u64 u64 u16 u16 u16 u16 u32 u16 u16 u16 u16 u16 u16 u16 u16 u32 u32 u32 u32 u32 u32 u32 u32 u32 u32`. Field order follows alphabetical GP symbol order: B_I, B_L, B_S, C, D, E, G_A, G_I, G_R, G_T, H, I, J, K, L, N, O, P, Q, R, T, U, V, W_A, W_B, W_C, W_E, W_M, W_P, W_R, W_T, W_X, Y. Must match GP lines 3650–3682 exactly.

**AccumulationInput encoding** (GP lines 4501–4504): Union with 1-byte tag. tag=0 (Operand/encode[U]): 4×bytes32 (packagehash, segroot, authorizer, payloadhash) + u64 gaslimit + O(result) + var{authtrace}. tag=1 (Transfer/encode[X]): u32 source + u32 dest + u64 amount + 128-byte memo + u64 gas.

**O(result) encoding** (GP lines 4506–4514): tag=0 + var-len blob (success); tag=1 (OOG); tag=2 (panic); tag=3 (bad exports); tag=4 (oversize); tag=5 (BAD); tag=6 (BIG).

**ImportRef I# encoding** (GP lines 4517–4523): 32-byte hash + u16 index. High bit of u16 = 1 means the hash is a work-package hash (H^⊞), high bit = 0 means normal segment-root hash. NOT a VarU64 scheme.

**ExtrinsicRef encoding** (GP lines 4472–4475): 32-byte hash + u32 length. NOT hash + VarU64.

**WorkItem.exportcount** is u16 (encode[2] per GP line 4468), NOT VarU64.

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

7. **ImportRef high-bit encoding.** The u16 index uses bit 15 as the work-package-hash discriminant (i + 2^15), NOT a separate 1-byte tag prefix. Decoding must mask bit 15 to recover the original index.

8. **ExtrinsicRef uses u32 for length, not VarU64.** Per GP line 4472, extrinsic references encode the length as encode[4]{i} (fixed 4-byte LE), not as VarU64. Using VarU64 produces incompatible encodings.

9. **WorkItem.exportcount is u16, not VarU64.** Per GP line 4468, exportcount uses encode[2], a fixed 2-byte LE encoding. Using VarU64 will produce the wrong byte count and shift all subsequent fields.
