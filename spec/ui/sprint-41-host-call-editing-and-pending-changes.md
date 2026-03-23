# Sprint 41 — Host Call Editing and Pending Changes

Status: Implemented

## Goal

Enable editing registers, gas, and memory while paused on a host call. Edits and trace resume proposals are unified into a single "pending changes" system that users can view and override. Storage table is restricted to read/write host calls only (not fetch/lookup). Log tab captures live memory for programs without a reference trace. The host-call hint text is removed.

## Prior Sprint Dependencies

- Sprint 18: host-call resume flow
- Sprint 19: host-call drawer tab
- Sprint 20: host-call storage table
- Sprint 29: registers inline editing
- Sprint 40: log tab fixes and trace memoryReads

## What Works After This Sprint

### Unified Pending Changes

1. **Editing enabled during host-call pause.** Registers, gas, and memory are editable when paused on a host call (`lifecycle === "paused_host_call"`, `snapshot.status === "ok" || "host"`). Previously editing was gated on `lifecycle === "paused"` and `status === "ok"` only.

2. **Pending changes hook.** A new `usePendingChanges(hostCallInfo, selectedPvmId)` hook manages mutable pending state. The hook derives the active host call internally from the `hostCallInfo` map and `selectedPvmId`. When a host call is detected, the state is initialized from the resume proposal (if available) or starts empty. Users can then edit registers, gas, and memory — edits accumulate in this state.

3. **Resume proposal pre-fills pending changes.** Trace-derived resume proposals (register writes, memory writes, gas) are pre-populated as editable pending changes. Users can override any value. This replaces the old model where the proposal was immutable and applied directly on resume.

4. **Dual-update on edit.** When the user edits a register, gas, or memory during a host-call pause, both the PVM state (for immediate display) and the pending changes (for resume) are updated. This ensures the UI reflects edits immediately while preserving them for the resume flow.

5. **Pending effects used on resume.** `resumeAllHostCalls` calls `getEffects()` once (outside the per-PVM loop) and stores the result. If non-null (user is paused and possibly edited), those effects are used as the base. If null (auto-continue, React hasn't processed the event), falls back to `proposalToEffects(resumeProposal)`. The base is always passed to `storageAwareEffects(hc, storageTable, base)` — no conditional branching.

6. **Reset clears pending changes.** Clicking Reset immediately clears the pending changes state via `clearHostCallEffects` before the async orchestrator reset.

### Pending Changes Display

7. **Banner at bottom of registers panel.** The `PendingChanges` component renders below the register rows (pinned with `shrink-0`). It has an amber background (`bg-amber-500/10`), a separate header div (`font-normal`, `border-t border-b border-border`, `text-foreground`) consistent with panel headers, and a content div with values in `text-amber-800 dark:text-amber-300`.

8. **Arrow notation.** Pending changes use arrow notation: `ω7 ← 0x2a`, `Gas ← 500000`, `[0x100] ← ab cd ...`. Memory writes show a byte count suffix.

9. **300ms debounce.** Visibility is debounced to prevent flashing during auto-continue passes.

### Orchestrator Changes

10. **`assertPaused` accepts `paused_host_call`.** The orchestrator's `assertPaused` guard now allows both `"paused"` and `"paused_host_call"` lifecycles for `setRegisters`, `setPc`, `setGas`, and `setMemory`.

11. **Lifecycle-preserving emissions.** `pvmStateChanged` events from state-editing methods (`setRegisters`, `setPc`, `setGas`, `setMemory`) emit `session.lifecycle` instead of hardcoded `"paused"`. This prevents a host-call edit from accidentally transitioning the UI out of `paused_host_call` state.

### Storage Table Routing

12. **Storage table only for read/write.** The `HostCallTab` contextual view routes only indices 3 (read) and 4 (write) to `StorageHostCall`. Indices 1 (fetch) and 2 (lookup) fall through to `GenericHostCall`. Fetch and lookup are not storage host calls.

13. **Two-column layout.** `StorageHostCall` always renders a two-column grid: host-call details + pending effects on the left, storage table on the right. The `storageTable` prop is no longer nullable.

14. **Removed fetch/lookup code.** `decodeFetchDetails`, `decodeLookupDetails`, `FetchDetails`, `LookupDetails`, and their labels were removed from `StorageHostCall.tsx`.

### Log Tab Fix

15. **Live memory capture for log host calls.** In `orchestrator.resumeHostCall()`, before applying effects, the orchestrator reads PVM memory at the register pointers (ω8/ω9 for target, ω10/ω11 for message) for log host calls (index 100). The private `captureLogMemoryReads(session, registers)` method takes registers as a separate parameter and uses named segment objects `{ ptr, len }`. These captured reads are passed to `appendHostCallEntry` and always take precedence over reference trace data. This ensures the Logs tab displays real log messages even without a reference trace.

16. **`appendHostCallEntry` priority.** The function accepts an optional `capturedMemoryReads` parameter. When provided, it is used unconditionally. The reference trace fallback only applies to non-log host calls where no live capture is provided.

### Bug Fixes and Polish

17. **PendingChanges debounce keyed on mount, not content.** The 300ms visibility debounce in `PendingChanges` is triggered once when the component mounts (host call detected), not on every `pending` state change. This prevents the banner from hiding for 300ms after each user keystroke during editing.

18. **Storage read override guards against missing address.** `storageAwareEffects` no longer falls back to address `0` when the proposal has no memory writes. If the destination address cannot be determined, the storage override is skipped entirely.

19. **Log memory read failures logged.** `captureLogMemoryReads` logs a `console.warn` when a memory read fails instead of silently swallowing the error.

20. **Termination `arg` recorded in trace.** `appendTermination` now accepts and records `exitArg` from the adapter step result. This populates the `arg` field on `TraceTermination`, which is used by the trace serializer for `PANIC=N` and `FAULT=N` output.

21. **Responsive storage table layout.** `StorageHostCall` uses `grid-cols-1 md:grid-cols-2` instead of unconditional `grid-cols-2`, so the layout stacks vertically in narrow drawers.

### UI Cleanup

22. **Hint text removed.** The "Use Step, Run, or Next to continue execution." text was removed from `HostCallHeader`.

## Files Changed

| File | Changes |
|------|---------|
| `apps/web/src/hooks/usePendingChanges.ts` | **New.** Hook managing mutable pending changes state with `setRegister`, `setGas`, `writeMemory`, `getEffects`, `clear` |
| `apps/web/src/hooks/usePendingChanges.test.tsx` | **New.** 13 unit tests covering initialization, edits, overrides, clear, reinit, and no-op safety |
| `apps/web/src/components/debugger/PendingChanges.tsx` | Accepts `PendingChangesData` instead of `HostCallResumeProposal`. Moved to bottom of registers panel. Arrow notation. Dual-mode amber colors. Header with `text-foreground` and bordered row. Debounce keyed on mount only |
| `apps/web/src/components/debugger/RegistersPanel.tsx` | Accepts `pendingChanges: UsePendingChanges` instead of `hostCallInfo`. Editable during `paused_host_call`. Register/gas edits route through pending changes during host-call pause |
| `apps/web/src/components/debugger/RegistersPanel.test.tsx` | Updated to use `pendingChanges` prop with mock `UsePendingChanges` |
| `apps/web/src/components/debugger/MemoryPanel.tsx` | Accepts optional `onPendingWrite` callback for host-call pause memory edits |
| `apps/web/src/hooks/useDebuggerActions.ts` | `resumeAllHostCalls` accepts `getEffects` function. `storageAwareEffects` accepts optional base with address guard. Reset calls `clearHostCallEffects`. Updated dependency arrays |
| `apps/web/src/pages/DebuggerPage.tsx` | Creates `usePendingChanges` hook. Wires `pendingChanges` to RegistersPanel, `onPendingWrite` to MemoryPanel, `getHostCallEffects`/`clearHostCallEffects` to useDebuggerActions. `allPausedOk` accepts `paused_host_call` lifecycle and `host` status |
| `apps/web/src/components/drawer/HostCallTab.tsx` | Fetch/lookup (1, 2) route to `GenericHostCall`. Hint text removed |
| `apps/web/src/components/drawer/hostcalls/StorageHostCall.tsx` | Removed fetch/lookup code. `storageTable` prop no longer nullable. Responsive two-column layout (`grid-cols-1 md:grid-cols-2`) |
| `packages/orchestrator/src/orchestrator.ts` | `assertPaused` accepts `paused_host_call`. State-edit methods emit `session.lifecycle`. `resumeHostCall` captures log memory reads. New `captureLogMemoryReads` private method with console.warn on failure. `appendTermination` call passes `exitArg` |
| `packages/orchestrator/src/session.ts` | `appendHostCallEntry` accepts optional `capturedMemoryReads`; captured reads take precedence over reference trace. `appendTermination` records `exitArg` as `arg` field |
| `spec/ui/sprint-19-host-call-drawer-tab.md` | Hint text marked as removed. Fetch/lookup routing note corrected |
| `spec/ui/sprint-20-host-call-storage.md` | StorageHostCall scope corrected to read/write only (3, 4) |
| `spec/ui/sprint-29-registers-inline-editing.md` | Editing during host-call pause marked as enabled. Status check updated |
| `spec/ui/sprint-40-drawer-polish-and-trace-fixes.md` | Note added: Sprint 41 supersedes reference-trace memoryReads for log host calls |

## Implementation Notes

- The `usePendingChanges` hook takes `(hostCallInfo, selectedPvmId)` and derives the active host call internally. It initializes state during render (not `useEffect`) by comparing the active HostCallInfo reference (`prevInfoRef`), so the pending data is available on the first render after a host-call transition. It uses a ref mirror (`pendingRef`) so `getEffects()` always reads the latest value without stale closures. The `clear()` method just nulls pending/ref — no sentinel states needed since reinit is keyed on HostCallInfo reference identity.
- During auto-continue in the run loop, `getEffects()` returns null because React hasn't processed the `hostCallPaused` event yet. The resume path falls back to `proposalToEffects(resumeProposal)`, preserving existing behavior.
- PC editing during host-call pause goes directly to the orchestrator (not through pending changes) because `HostCallResumeEffects` has no PC field.
- The orchestrator package must be rebuilt (`npm run build` in `packages/orchestrator`) after changes since the web app imports from `dist/`.
