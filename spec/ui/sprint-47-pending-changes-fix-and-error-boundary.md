# Sprint 47 — Pending Changes Fix and Error Boundary

Status: Implemented

## Goal

Fix "Pending Host Call Changes" banner appearing during continuous execution (when PVM is running, not stopped at a host call). Fix crash (React error #185 — Maximum update depth exceeded) when running trace examples with auto-continue. Add an error boundary so uncaught render errors show a recovery UI instead of crashing the app to a blank page.

## Prior Sprint Dependencies

- Sprint 41: pending changes system, `usePendingChanges` hook
- Sprint 42: host call UX redesign, auto-apply flow

## What Works After This Sprint

### Stale Host Call Info Cleanup

1. **`hostCallInfo` entries cleared after resume.** In `useOrchestratorState`, when `onStateChanged` fires with a lifecycle other than `"paused_host_call"`, the PVM's entry is deleted from `pendingHostCallInfo`. This ensures stale host call info does not persist in React state after auto-continue resumes a host call during the run loop.

2. **Flush always propagates clearing.** When a PVM transitions away from `paused_host_call`, `pendingHostCallInfo.current` is always set (even to an empty Map) so the next rAF flush replaces any stale React state. Previously, if `pendingHostCallInfo.current` was null (already flushed) and the React state had a stale entry, it would never be cleared.

### Pending Changes Display Guard

3. **Lifecycle-gated rendering.** `RegistersPanel` now only renders the `<PendingChanges>` component when `lifecycle === "paused_host_call"` in addition to `pendingChanges.pending` being non-null. Previously, the component rendered whenever `pending` was non-null, which could happen when stale `hostCallInfo` entries leaked through during continuous execution.

4. **No visible change during manual host-call pauses.** When the user is genuinely paused at a host call (manual stepping or auto-continue policy stops), the lifecycle is `"paused_host_call"` and the banner renders as before. The existing E2E tests and unit tests continue to pass unchanged.

### Crash Fix — Suppress Host Call State While Running

5. **`useHostCallState` returns null while running.** The `activeHostCall` useMemo returns null when `isRunning` is true. This prevents transient `paused_host_call` state from reaching the HostCallTab during auto-continue, which would trigger cascading setState calls and `orchestrator.setGas()` async operations that exceed React's max update depth.

6. **Root cause.** The PVM adapter runs in a Web Worker. Worker `postMessage` is a macrotask, so `requestAnimationFrame` callbacks can fire between the orchestrator's host-call detection (`adapter.step()`) and resume (`adapter.setRegisters()/setMemory()/setGas()`). When the rAF fires in this window, React renders with `paused_host_call` lifecycle and `hostCallInfo` entry. The HostCallTab mounts, its render-time setState fires (×4), its useEffect applies effects which call `pendingChanges.setRegister/setGas` (more setState), and `orchestrator.setGas()` emits another `pvmStateChanged` event. With 43+ log host calls in trace-001, these cascading updates exceed React's 50-render limit.

7. **`isRunning` threaded through BottomDrawer.** `DebuggerPage` passes `isRunning` to `BottomDrawer`, which passes it to `useHostCallState`. The hook suppresses all host-call-related state and drawer auto-opening while the PVM is running.

### Error Boundary

8. **`ErrorBoundary` component.** A new class component `ErrorBoundary` catches uncaught render errors via `getDerivedStateFromError` and `componentDidCatch`. It displays the error message in a styled container with a "Reload" button that navigates to `#/load` and reloads the page.

9. **Wraps the app content.** The `ErrorBoundary` is placed in `App.tsx` around `<RestoreGate>` and `<Routes>`, inside the `OrchestratorProvider` and layout shell. Any rendering crash in the debugger page, load page, or restore gate is caught and displayed instead of showing a blank page.

## Bug Details

The root cause of the spurious "Pending changes" banner was a two-part issue:

- **Missing cleanup:** The `onHostCallPaused` event handler in `useOrchestratorState` added entries to `pendingHostCallInfo`, but no code path ever removed them when the host call was resumed. During the run loop, `resumeHostCall` emits `pvmStateChanged(paused)` but nothing cleared the host call info entry. The stale entry survived across rAF flushes.

- **Missing guard:** `RegistersPanel` rendered `<PendingChanges>` whenever `pendingChanges.pending` was non-null. Since `usePendingChanges` derived `pending` from `hostCallInfo.get(selectedPvmId)`, and the stale entry was never removed, `pending` was always non-null after the first host call.

## Files Changed

| File | Changes |
|------|---------|
| `apps/web/src/hooks/useOrchestratorState.ts` | `onStateChanged` handler clears `pendingHostCallInfo` entry when lifecycle is not `paused_host_call`. Forces `pendingHostCallInfo.current` assignment so rAF flush propagates clearing |
| `apps/web/src/hooks/useHostCallState.ts` | `activeHostCall` returns null when `isRunning` is true. Accepts `isRunning` parameter |
| `apps/web/src/components/debugger/BottomDrawer.tsx` | Accepts and passes `isRunning` prop to `useHostCallState` |
| `apps/web/src/pages/DebuggerPage.tsx` | Passes `isRunning` to `BottomDrawer` |
| `apps/web/src/components/debugger/RegistersPanel.tsx` | `PendingChanges` rendering gated on `lifecycle === "paused_host_call"` |
| `apps/web/src/components/ErrorBoundary.tsx` | **New.** React error boundary with error display and reload button |
| `apps/web/src/App.tsx` | Wraps routes in `<ErrorBoundary>` |
| `apps/web/e2e/sprint-47-trace-run-stability.spec.ts` | **New.** E2E tests for trace run stability: crash reproduction, pending changes guard |

## Implementation Notes

- The `useHostCallState` hook (used by `BottomDrawer`) already checked `entry?.lifecycle !== "paused_host_call"` before returning host call info, so it was unaffected by the stale entries. The bug only manifested through `usePendingChanges`, which accessed `hostCallInfo` directly without a lifecycle check.
- The rAF buffering in `useOrchestratorState` means that during a run loop batch, multiple `onHostCallPaused` + `onStateChanged(paused)` pairs fire synchronously. By the time the rAF flushes, the last `onStateChanged(paused)` has already cleared the entry, so React never sees the intermediate `paused_host_call` state during continuous execution.
- The `ErrorBoundary` is a class component because React's error boundary API (`getDerivedStateFromError`, `componentDidCatch`) is only available as class component methods.
