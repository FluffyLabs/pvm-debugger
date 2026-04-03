# Sprint 42 — Host Call UX Redesign, Handler Improvements, and GP Alignment

Status: Implemented

**GP Reference:** [graypaper-ab2cdbd](https://gp.fluffylabs.dev/graypaper-ab2cdbd5b070ba2176e8dd830b06401ce05a954d.md) (Appendix B §B.5–B.7 for host call indices)

## Goal

Redesign the host call tab to a two-column layout with auto-apply (removing the manual Apply button). Improve existing handlers: storage read with correct offset/maxLen slicing, generic handler with comments and line numbers, gas handler simplification. Update host call index mapping to match the target GP revision. Fix refine entrypoint encoding. Add pending changes coalescing. Highlight the active host call in the reference trace. Add the all-ecalli example program.

## Prior Sprint Dependencies

- Sprint 41: host-call editing and pending changes
- Sprint 40: drawer polish and trace fixes
- Sprint 19: host-call drawer tab
- Sprint 20: host-call storage table

## What Works After This Sprint

### Host Call Tab UX Redesign (`HostCallTab.tsx`)

1. **Two-column layout.** Left sidebar (fixed 192px) shows host call badge, input registers with labels (only relevant ones per handler type), output register preview, and **memory write count** (e.g., `"+ 3 memory write(s)"`). Right content area (flex-1, scrollable) shows the handler-specific editor. Sidebar and StickyBar are extracted into named sub-components with typed props for testability.

2. **Sticky bottom bar** with NONE toggle, "Use Trace Data" button (styled as a visually distinct amber pill: `bg-amber-500/20 text-amber-300 hover:bg-amber-500/30`), **"Changes auto-applied" passive confirmation text** (visible when no error), and error display. The old Apply button is removed.

3. **Auto-apply.** Changes are applied to the pending changeset immediately via `onEffectsReady` callback. Each handler reports effects reactively — no manual Apply step.

4. **"Use Trace Data" button.** Resets the handler to trace state when the user has made local modifications. Uses a `traceVersion` counter to trigger reset in child components.

5. **Register metadata** (`host-call-registers.ts`). Per-handler declaration of which registers are inputs (with labels like "dest", "offset", "kind") and what the output register means. Each register has a **`format` field** (`"hex" | "decimal" | "custom"`) controlling display: pointers and hashes in hex, counts and sizes in decimal. A reusable `formatRegValue(value, format)` utility is exported. Read/info handlers must include offset/maxLen registers.

6. **Output preview** in sidebar shows the computed output register value (e.g., "ω₇ ← 134 (0x86)") updating live as the user edits.

7. **NONE toggle** in the sticky bar for handlers that support it (lookup, read, info). When checked, returns ω₇ = 2^64-1 with no memory writes. Cleans up previously-applied memory writes from the pending changeset.

### Handler Simplification

8. **Content-only handlers.** All handlers (Gas, Generic, Storage, Log) no longer include headers, register grids, or Apply buttons. They communicate effects via `onEffectsReady` callback.

9. **GasHostCall** auto-reports ω₇ = currentGas on mount. Minimal display.

10. **GenericHostCall** parses trace commands live and reports effects on every keystroke. **Command format** uses human-readable arrow syntax: `setreg r07 <- 0x2a`, `memwrite 0x00001000 len=4 <- 0xaabbccdd`, `setgas <- 500000`. **Comment lines** starting with `#` are ignored. **Error messages include line numbers** (e.g., `"Line 3: Malformed setreg: ..."`). **Register writes are sorted by index** before serializing to produce consistent output.

11. **`setgas` fully wired in GenericHostCall.** `HostCallEffects` now includes an optional `gasAfter` field. The generic handler's `parseAllCommands` collects `setgas` commands and includes them in effects. `HostCallTab.applyEffects` applies gas via `pendingChanges.setGas()` and `orchestrator.setGas()` for all PVMs.

### Storage Read/Write Improvements

12. **Storage read produces effects with correct offset/maxLen slicing.** When paused on a read host call (index 3), the handler looks up the scoped key in the storage table. If found, reads `offset` from register 11 and `maxLen` from register 12, slices the value as `value.slice(min(offset, len), min(offset + maxLen, len))`, sets ω₇ = total value length, and writes the sliced data to memory. If not found, returns NONE. Must NOT ignore offset and always slice from byte 0.

13. **Service ID scoping.** Storage keys are scoped as `"serviceId:keyHex"` (e.g., `"self:0x74657374"`). Service ID `0xffffffffffffffff` maps to `"self"`. Storage lookup uses **O(1) Map-based `store.get(fullKey)`**, not linear scan via `.find()`.

14. **Trace data seeds the storage table.** On mount, trace proposal data is inserted into the storage table so it becomes the single editable source of truth. Must **check for existing entry before seeding** to avoid overwriting user edits.

15. **Key display with ASCII.** Shows the decoded key hex and, if all bytes are printable ASCII, the decoded string (e.g., `0x74657374 "test"`).

16. **Live status indicator.** Shows "Key found in storage table" (green) or "Key not found — will return NONE" (amber), updating reactively when the table is edited.

17. **`safeFromHex` defensive hex parsing.** A helper that tolerates odd-length hex strings by padding (prepending `"0"`) before decoding, preventing crashes from user typos. Uses try/catch fallback to empty `Uint8Array(0)`.

18. **Responsive grid layout** for storage host call: `grid grid-cols-1 md:grid-cols-2`, placing key info and storage table side-by-side on wider screens instead of stacking vertically.

### Pending Changes Improvements

19. **Consecutive memory writes coalesced in display.** `PendingChanges.tsx` merges adjacent/overlapping memory writes into contiguous ranges for display (e.g., 32 individual byte writes shown as one `[0x100] ← ... (32B)`).

20. **Scrollable pending changes.** The pending changes area scrolls when too tall, with a sticky header. Registers panel maintains minimum height for 3 rows (Tailwind `min-h-[4.5rem]`, not inline style).

21. **`removeMemoryWrite` method.** Added to `usePendingChanges` so the host call tab can clean up stale writes when effects change (e.g., NONE toggled on). Only removes host-call-originated writes; user edits from the Memory pane are preserved.

### GP Alignment (graypaper-ab2cdbd, Appendix B)

22. **Host call index mapping updated.** `HOST_CALL_NAMES` in `packages/trace/src/host-call-names.ts` now matches the target GP revision (Appendix B §B.5–B.7): General (0–5: gas, fetch, lookup, read, write, info), Refine (6–13: historical_lookup, export, machine, peek, poke, pages, invoke, expunge), Accumulate (14–26: bless, assign, designate, checkpoint, new_service, upgrade, transfer, eject, query, solicit, forget, yield_result, provide), JIP (100: log).

23. **Refine entrypoint encoding fixed.** `workPackageHash` is now encoded as fixed 32 bytes (no length prefix), replacing the old `package` field that was incorrectly length-prefixed.

### Reference Trace Active Entry Highlight

24. **Active host call highlighted in reference trace.** When paused on a host call, the corresponding reference trace entry gets a blue highlight (`bg-blue-500/20 ring-1 ring-inset ring-blue-500/40`). The `activeEntryIndex` is computed inside `EcalliTraceTab` from `activeHostCall` and `recorded.entries.length` — not in `BottomDrawer`.

### Shared Utilities

25. **`HostCallEffects` interface** defined in `apps/web/src/lib/fetch-utils.ts` (canonical location) and re-exported from `HostCallTab.tsx`. Has three fields: `registerWrites: Map<number, bigint>`, `memoryWrites: Array<{address, data}>`, `gasAfter?: bigint`.

26. **`NONE` constant** (`(1n << 64n) - 1n`) defined once in `fetch-utils.ts` and imported everywhere.

27. **`useStableCallback` hook** (`apps/web/src/hooks/useStableCallback.ts`). Extracts the repeated `useRef(fn); ref.current = fn` pattern into a reusable hook that returns a stable function identity. Used in GasHostCall, GenericHostCall, and StorageHostCall.

### SPI Entrypoint Config

28. **Defensive 32-byte hash handling** (`SpiEntrypointConfig.tsx`). The `workPackageHash` field always initializes a 32-byte buffer and safely limits input via `.subarray(0, 32)` with try/catch. All-zero hashes are suppressed in display (show empty string). Must NOT produce 0-byte hashes or show 66-character zero strings.

### All-Ecalli Example Program

29. **New fixture** `fixtures/all-ecalli.jam` (93KB). Compiled from `as-lan/examples/all-ecalli/`. Invokes every host call in both refine (gas, 14 fetch variants, lookup, read, write, info, log, historical_lookup, export, machine, peek, poke, pages, invoke, expunge) and accumulate (gas, 4 fetch variants, lookup, read, write, info, log, bless, assign, designate, checkpoint, new_service, upgrade, transfer, eject, query, solicit, forget, yield_result, provide) contexts.

30. **Two example entries** in the AssemblyScript → PVM category: "All Ecalli (Refine)" and "All Ecalli (Accumulate)".

### E2E Tests

31. **E2E test** (`sprint-42-host-call-ux.spec.ts`). Playwright tests using `io-trace` (storage read/write, generic host calls) and `all-ecalli` (GP name coverage). Must:
    - Load the io-trace example and step to a host call.
    - Verify the **two-column layout** renders: sidebar (`data-testid="host-call-sidebar"`) with register labels and output preview, content area with handler editor.
    - Verify **"Changes auto-applied"** text appears in the sticky bottom bar when no error.
    - Verify **memory write count** appears in the sidebar (e.g., `"+ N memory write(s)"`).
    - Step to a **storage read** host call and verify the storage handler shows key info and status indicator ("Key found" / "Key not found").
    - Verify **NONE toggle** for a read/lookup host call: checking the box changes the output preview to show the NONE sentinel value (2^64-1).
    - Verify **GP host call names** appear correctly in the trace column badges (e.g., "gas", "fetch", "write", "log" — not numeric indices).
    - Verify the **active trace entry highlight** is visible (blue ring) when paused on a host call.
    - Verify **pending changes coalescing**: after stepping through host calls that produce memory writes, the pending changes panel shows coalesced ranges (not individual byte writes).
    - Load **all-ecalli-refine** and verify both example cards are visible on the load page.
    - Step through the all-ecalli-refine example and verify GP host call names appear in trace badges (e.g., "gas", "fetch", "write", "log").

## Key Implementation Details

**`NONE_SUPPORTED` set** in `HostCallTab.tsx` controls which host call indices show the NONE checkbox: `new Set([2, 3, 5])` (lookup, read, info). Fetch (index 1) NONE is handled in Sprint 43.

**Auto-apply state machine** in `HostCallTab`: `initialEffectsApplied` ref tracks whether the first effects report (from trace/defaults) has been applied. `userModified` state becomes true after the first auto-apply. `traceVersion` counter increments on "Use Trace Data" click, resetting `userModified` and `initialEffectsApplied`.

**`appliedMemAddrsRef`** in `HostCallTab` tracks which memory write addresses the tab has applied. On each `applyEffects`, stale addresses not in the new effects are removed via `pendingChanges.removeMemoryWrite()`.

**`useKeyFromMemory` hook** in `StorageHostCall` reads key bytes from PVM memory via `orchestrator.getMemory()` with async cancellation. Falls back to null if orchestrator unavailable.

**`scopedKey` function** in `StorageHostCall` builds storage table keys as `"serviceId:keyHex"`. Service ID `0xffffffffffffffff` (u64 max = "self") maps to `"self"`.

**Trace seeding** in `StorageHostCall` uses a `seededRef` guard to insert trace data into the storage table exactly once. Must check `if (!storageTable.store.get(fullKey))` before seeding.

**Two-column layout** uses `-mx-3 -my-2` negative margins to reclaim the drawer content area's `px-3 py-2` padding, allowing the sidebar and sticky bar to extend edge-to-edge.

**`RegistersPanel.test.tsx`** mock updated to include `removeMemoryWrite: noop` in `makePendingChanges`.

## Verification / Acceptance Criteria

### Unit Tests
- `coalesceMemoryWrites` merges adjacent/overlapping writes correctly (7 tests)
- `removeMemoryWrite` removes by address, no-op for non-existent/null (3 tests)
- `HOST_CALL_NAMES` matches target GP revision (index 14 = "bless", index 100 = "log", etc.)
- Refine entrypoint encoding produces fixed 32-byte `workPackageHash` (no length prefix)
- All existing tests continue to pass

### E2E Tests
- Two-column layout renders with sidebar and content area
- "Changes auto-applied" visible in sticky bar
- Memory write count visible in sidebar
- Storage read handler shows key info and status indicator
- NONE toggle changes output to sentinel value
- GP host call names in trace badges
- Active trace entry has blue highlight ring
- Pending changes shows coalesced memory write ranges

### Build
```bash
npm install && npm run build && npm test
cd apps/web && npx playwright test sprint-42
cd apps/web && npx vite build
```

## Files Created

- `apps/web/src/lib/fetch-utils.ts` — HostCallEffects interface, NONE constant
- `apps/web/src/hooks/useStableCallback.ts`
- `apps/web/src/components/drawer/hostcalls/host-call-registers.ts`
- `apps/web/e2e/sprint-42-host-call-ux.spec.ts`
- `fixtures/all-ecalli.jam`

## Files Modified

- `packages/trace/src/host-call-names.ts` — GP-aligned index mapping
- `packages/content/src/spi-entrypoint.ts` — refine encoding fix (workPackageHash)
- `packages/content/src/examples-manifest.ts` — workPackageHash default
- `apps/web/src/components/drawer/HostCallTab.tsx` — two-column layout + auto-apply
- `apps/web/src/components/drawer/hostcalls/GasHostCall.tsx` — content-only + auto-apply
- `apps/web/src/components/drawer/hostcalls/GenericHostCall.tsx` — content-only + live effects + comments + line numbers
- `apps/web/src/components/drawer/hostcalls/StorageHostCall.tsx` — storage table effects + offset/maxLen + responsive grid
- `apps/web/src/components/drawer/EcalliTraceTab.tsx` — active entry highlight (self-contained computation)
- `apps/web/src/components/drawer/TraceColumn.tsx` — active entry prop
- `apps/web/src/components/drawer/TraceEntryRow.tsx` — active entry styling
- `apps/web/src/components/debugger/BottomDrawer.tsx` — thread pendingChanges + activeHostCall
- `apps/web/src/components/debugger/RegistersPanel.tsx` — min-height (Tailwind class)
- `apps/web/src/components/debugger/PendingChanges.tsx` — coalesced display + scrollable
- `apps/web/src/hooks/usePendingChanges.ts` — removeMemoryWrite
- `apps/web/src/pages/DebuggerPage.tsx` — thread pendingChanges to drawer
- `apps/web/src/components/load/SpiEntrypointConfig.tsx` — workPackageHash field + defensive 32-byte hash
- `apps/web/src/hooks/usePersistence.ts` — workPackageHash serialization
- `fixtures/examples.json` — all-ecalli examples in AssemblyScript category

## Edge Cases and Pitfalls

1. **Storage read offset/maxLen registers.** Read host call uses r11 = offset and r12 = maxLen. Ignoring the offset and always slicing from byte 0 produces incorrect effects for reads that specify a non-zero offset.

2. **`package` → `workPackageHash` rename is pervasive.** Touches 6+ files across 3 packages. String-keyed field references like `fields["package"]` must also be updated.

3. **HOST_CALL_NAMES test assertions must match target GP revision.** Index 14 was previously unmapped but is now `"bless"`.

4. **RegistersPanel.test.tsx mock must include `removeMemoryWrite`.** Adding a new method to `UsePendingChanges` interface requires updating all test mocks.

5. **`activeEntryIndex` for trace highlight.** The active host call's sequential index = `recorded.entries.length` (the current host call hasn't been recorded yet). Compute this inside `EcalliTraceTab`, not `BottomDrawer`.

6. **GPG signing may fail in CI.** Use `-c commit.gpgsign=false` as a fallback if signing is unavailable.
