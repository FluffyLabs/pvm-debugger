# UI-012 - Bottom Drawer - Host Call Tab

## Purpose

Implement the `Host Call` drawer tab as the high-level inspection surface for paused host calls.

The tab explains the current host call and any pending effects, but it does not own execution controls. Users continue through `Next`, `Step`, or `Run`.

## Required Files

```
apps/web/src/components/drawer/HostCallTab.tsx
apps/web/src/components/drawer/hostcalls/GenericHostCall.tsx
apps/web/src/components/drawer/hostcalls/GasHostCall.tsx
apps/web/src/components/drawer/hostcalls/StorageHostCall.tsx
apps/web/src/components/drawer/hostcalls/LogHostCall.tsx
apps/web/src/hooks/useHostCallState.ts
apps/web/src/hooks/useStorageTable.ts
apps/web/e2e/drawer-host-call.spec.ts
```

## Activation Contract

Rules:

- when no PVM is paused on a host call, show the empty-state message
- when `hostCallPaused` fires for an unresolved host call, the drawer auto-opens to `Host Call`
- auto-continue policies that silently resolve a host call must not open the tab

## Common Header Contract

Every active host call view shows:

- host call name and numeric index
- active PVM id
- current PC and gas
- a hint reminding the user to use `Step/Run/Block` to continue

Rules:

- there is no separate `Resume` or `Continue` button in this tab
- pending effects shown here must stay consistent with the Registers panel

## Contextual View Contract

### Gas (`index 0`)

- informative only
- show current gas and the pending gas/register effects

### Storage (`index 3` and `4`)

- decode read/write details into human-readable labels
- render an editable storage table that persists across host calls for the same execution session
- highlight the active key when present in the table
- allow adding new key/value entries and editing existing values
- storage writes update the persistent storage table after the host call resumes
- storage-backed resume effects may override trace memory writes when the user has supplied a custom value

### Log (`index 100`)

- decode the message text from trace memory reads when available
- fall back to reading message memory from the current registers when trace data is unavailable
- show both the readable message and raw hex

### Generic fallback

- show current register state
- show pending effects from the trace proposal, if any
- explain that no dedicated high-level handler exists

## Storage State Contract

Storage state is execution-scoped, not global.

Rules:

- reset the storage table when the orchestrator instance is replaced
- keep storage entries stable across multiple read/write host calls during the same session
- avoid `useSyncExternalStore` snapshot churn; subscriptions must expose a stable cached snapshot or revision counter

## Implementation Notes

- `useHostCallState` should prefer the selected PVM's paused host call and fall back to the first paused host call
- shared storage helpers should be reusable both by the Host Call tab and by execution-control resume logic
- trace-backed host calls still use the sequential trace proposal model; custom storage values only override the relevant read/write effects

## Testing Requirements

E2E coverage must prove:

- the empty state renders when no host call is active
- unresolved host calls auto-open the drawer tab
- the generic host call view appears for unsupported host calls
- log host calls show readable decoded text
- storage host calls show an editable storage table
- no resume/continue button is rendered in the tab
- matching auto-continue policies keep the drawer closed

## Acceptance Criteria

- The Host Call tab auto-opens for unresolved paused host calls.
- The tab never renders a dedicated resume button.
- Gas, storage, log, and generic host calls each render an appropriate contextual view.
- Storage entries persist across read/write host calls during the same session and reset on orchestrator replacement.
- Log host calls show readable message text plus raw hex.
- Pending effects shown in the tab match the execution-resume behavior.
- Matching auto-continue policies resolve host calls without opening the drawer.
- `npm run build -w @pvmdbg/web` succeeds.
- `cd apps/web && npx playwright test e2e/drawer-host-call.spec.ts` succeeds.

## Verification

```bash
npm run build -w @pvmdbg/web
cd apps/web && npx playwright test e2e/drawer-host-call.spec.ts
```
