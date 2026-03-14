# 006 - Orchestrator

## Purpose

Implement `packages/orchestrator` as the multi-PVM execution coordinator:

- strictly typed event emitter with no Node-only dependencies
- per-PVM session tracking and lifecycle management
- concurrent stepping with timeout and failure isolation
- host-call pause/resume handling with trace-backed proposals
- breakpoint-aware execution and recorded trace export

## Required Files

```
packages/orchestrator/src/index.ts
packages/orchestrator/src/orchestrator.ts
packages/orchestrator/src/typed-event-emitter.ts
packages/orchestrator/src/session.ts
packages/orchestrator/src/host-call-handler.ts
```

## Public API

Export:

- `TypedEventEmitter`
- `Orchestrator`
- `buildHostCallInfo`
- `serializeRecordedTrace`
- `Session` type

`TypedEventEmitter<Events>` must support:

- `on(event, listener)`
- `off(event, listener)`
- `emit(event, ...args)`
- `removeAllListeners()`

`Orchestrator` must support:

- PVM registration: `addPvm()`, `removePvm()`, `shutdown()`
- load lifecycle: `loadProgram()`, `reset()`
- execution: `step()`, `setBreakpoints()`, `getBreakpoints()`, `resumeHostCall()`
- trace access: `setTrace()`, `getRecordedTrace()`, `getReferenceTrace()`
- state access: `getSnapshots()`, `getSnapshot()`, `getPendingHostCall()`
- UI queries: `getPvmIds()`, `getProgramBytes()`, `getPageMap()`
- editing: `setRegisters()`, `setPc()`, `setGas()`, `getMemory()`, `setMemory()`

## Session Rules

`session.ts` must define a plain data object, not a class. Store:

- adapter
- lifecycle
- last snapshot
- host-call counter
- pending host-call info
- recorded trace
- optional reference trace
- loaded envelope copy

All stored envelope, trace, snapshot, and host-call data must be cloned on read/write boundaries.

## Step Semantics

`step(n)` must:

1. Skip PVMs not in `"paused"` lifecycle.
2. Still include skipped PVMs in the returned `StepResult`.
3. Execute active PVMs concurrently with `Promise.allSettled`.
4. Enforce timeout with `Promise.race`.
5. Attribute every timeout or thrown adapter error to the correct `pvmId`.
6. Mark failing sessions as `"failed"` and timed-out sessions as `"timed_out"` without affecting other PVMs.

Breakpoint behavior:

- if breakpoints exist, step one instruction at a time
- stop exactly when the current PC matches a breakpoint
- emit `pvmStateChanged(..., "paused")`
- report `hitBreakpoint: true`

Terminal behavior:

- `"host"` transitions to `"paused_host_call"`
- `"halt"`, `"panic"`, `"fault"`, and `"out_of_gas"` transition to `"terminated"`
- terminal execution records a trace termination entry

## Host Call Handling

`host-call-handler.ts` is the single place that builds `HostCallInfo`.

Rules:

- match reference trace entries by sequential host-call position only
- use `referenceTrace.entries[hostCallCounter]`
- increment the counter explicitly in the returned result
- derive `hostCallName` via `getHostCallName()`
- convert trace memory writes with `traceMemoryWriteToBytes()`
- compute structured mismatches for host call index, PC, and gas

`resumeHostCall()` must:

- reject unless lifecycle is `"paused_host_call"`
- apply register writes, memory writes, and optional gas update through the adapter
- refresh the snapshot after applying effects
- record the trace entry using the actual applied effects, not the proposal
- clear `pendingHostCall`
- transition back to `"paused"`
- emit `pvmStateChanged`

## Event Contract

Every lifecycle transition must emit `pvmStateChanged`.

Required ordering:

- `loadProgram()` emits `pvmStateChanged(..., "paused")` for each PVM before the promise resolves
- `reset()` emits `pvmStateChanged(..., "paused")` for each PVM before the promise resolves
- host-call pause emits `pvmStateChanged(..., "paused_host_call")` before `hostCallPaused`
- terminal status emits `pvmStateChanged(..., "terminated")` before `terminated`
- state editing methods emit `pvmStateChanged(..., "paused")` after mutation

Error handling:

- step timeout or adapter failure emits `error(pvmId, error)`
- error attribution must preserve the originating `pvmId`

## State Editing Rules

`setRegisters()`, `setPc()`, `setGas()`, and `setMemory()`:

- are only allowed while lifecycle is `"paused"`
- delegate the real mutation to the adapter
- refresh the snapshot from the adapter afterward
- emit `pvmStateChanged`

`setPc()` must call `adapter.setPc(pc)` and must not patch only the cached snapshot.

## Trace Recording

The orchestrator maintains a per-PVM recorded `EcalliTrace`.

Rules:

- on `loadProgram()`, initialize the prelude from the loaded envelope
- on `reset()`, rebuild the recorded trace prelude from the loaded envelope
- on `resumeHostCall()`, append one ECALLI entry using actual applied effects
- on termination, append a termination record
- the recorded trace must roundtrip through `serializeTrace()`

## Acceptance Criteria

- `TypedEventEmitter` supports subscribe, emit, unsubscribe, and remove-all semantics in browser-safe code.
- `step()` uses `Promise.allSettled` and keeps fast PVMs progressing when another PVM times out or throws.
- Timeout is enforced and reported as lifecycle `"timed_out"`.
- Direct adapter failures are reported as lifecycle `"failed"` with the correct `pvmId`.
- Breakpoints stop exactly on the matching PC.
- Host-call pause emits `pvmStateChanged("paused_host_call")` before `hostCallPaused`.
- `resumeHostCall()` rejects outside `"paused_host_call"`.
- Host-call proposals are built from the Nth trace entry for the Nth encountered host call.
- Proposal memory writes are converted through `traceMemoryWriteToBytes()`.
- `loadProgram()` deep-clones the envelope and forwards `loadContext`.
- `loadProgram()` and `reset()` emit `pvmStateChanged` before resolving.
- `setRegisters()`, `setPc()`, `setGas()`, and `setMemory()` only work while paused and emit `pvmStateChanged` after mutation.
- `setPc()` updates interpreter state, not only cached state.
- `getPvmIds()`, `getProgramBytes()`, `getPageMap()`, `getPendingHostCall()`, `getRecordedTrace()`, and `getReferenceTrace()` expose the current orchestrator state correctly.
- Recorded traces serialize to ECALLI text, including host-call entries and termination records.

## Verification

```bash
npm run build -w packages/orchestrator
npm test -w packages/orchestrator
npm run build
npm test
cd apps/web && npx vite build
```
