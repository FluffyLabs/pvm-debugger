# Sprint 19 — Host Call Drawer Tab

Status: Implemented

## Goal

Replace the Host Call drawer placeholder with a real inspection panel. When the PVM pauses on a host call, the drawer auto-opens to this tab showing host-call details. The tab provides information only — execution continues through the toolbar controls.

## What Works After This Sprint

- Host Call tab auto-opens when a PVM pauses on an unresolved host call
- Common header shows: host-call name, index, PVM id, PC, gas
- Contextual views for Gas, Log, and Generic host calls
- Empty state when no host call is active
- A hint reminds users to use Step/Run/Next to continue
- No resume/continue button in the tab
- Auto-continued host calls do not open the tab

## Prior Sprint Dependencies

- Sprint 14: drawer shell
- Sprint 18: host-call resume flow

## Required Files

```
apps/web/src/components/drawer/HostCallTab.tsx
apps/web/src/components/drawer/hostcalls/GenericHostCall.tsx
apps/web/src/components/drawer/hostcalls/GasHostCall.tsx
apps/web/src/components/drawer/hostcalls/LogHostCall.tsx
apps/web/src/hooks/useHostCallState.ts
apps/web/e2e/sprint-19-host-call-tab.spec.ts
```

## Activation Contract

- when no PVM is paused on a host call, show empty-state message
- when `hostCallPaused` fires for an unresolved host call, auto-open the drawer to `Host Call`
- auto-continue policies that silently resolve a host call must not open the tab

The `hostCallPaused` → auto-open behavior uses `DrawerContext.openToTab("host_call")` from Sprint 14.

## Common Header Contract

Every active host-call view shows:

- host-call name (from `HOST_CALL_NAMES`) and numeric index
- active PVM id
- current PC and gas
- hint text: "Use Step, Run, or Next to continue execution."

## Contextual View Contract

### Gas (`index 0`)

- informative only
- show current gas and pending gas/register effects

### Log (`index 100`)

- decode message text from trace memory reads when available
- fall back to reading memory from current registers when trace data is unavailable
- show both readable message and raw hex

### Generic fallback

- show current register state
- show pending effects from trace proposal, if any
- explain that no dedicated handler exists for this host call

Storage host calls (index 3, 4) get their own dedicated view in Sprint 20.

## No Resume Button

The tab never renders a dedicated resume/continue button. The hint text directs users to the toolbar.

## E2E Tests

```
- empty state renders when no host call is active
- pausing on a host call auto-opens the drawer to Host Call tab
- common header shows host-call name and index
- log host call shows decoded readable text
- generic fallback renders for unsupported host calls
- no resume button is present in the tab
- auto-continued host calls do not open the tab
```

## Acceptance Criteria

- Host Call tab auto-opens for unresolved paused host calls.
- No resume button in the tab.
- Gas, Log, and Generic views each render appropriate content.
- Empty state shows when no host call is active.
- Auto-continued host calls keep the tab closed.
- `cd apps/web && npx vite build` succeeds.
- E2E tests pass.

## Implementation Notes

- `useHostCallState` derives the active host call by checking both the `hostCallInfo` map AND the PVM's current lifecycle (`paused_host_call`). This ensures auto-continued host calls (where lifecycle transitions away quickly) don't trigger the drawer.
- Auto-open uses a prev-ref pattern: only opens the drawer when transitioning from null → non-null active host call, avoiding re-opens on host call info updates.
- Log host call decoding first tries trace `memoryWrites` (for trace-backed replays), then falls back to `orchestrator.getMemory()` to read message bytes at runtime.
- Storage host calls (index 1-4) fall through to the GenericHostCall view — Sprint 20 will add dedicated views.
- The sprint-14 drawer E2E test was updated to expect the new empty-state text instead of the old "coming soon" placeholder.
- `BottomDrawer` now receives `hostCallInfo`, `selectedPvmId`, `snapshots`, and `orchestrator` as props from `DebuggerPage`.

## Verification

```bash
cd apps/web && npx vite build
npx playwright test e2e/sprint-19-host-call-tab.spec.ts
```
