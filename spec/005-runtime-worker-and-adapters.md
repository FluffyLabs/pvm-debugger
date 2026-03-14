# 005 - Runtime Worker Bridge And PVM Adapters

Status: Implemented

## Purpose

Implement `packages/runtime-worker` as the execution layer for real PVM interpreters:

- synchronous interpreter wrappers for Typeberry and Ananas
- a direct async adapter for Node.js and CLI usage
- a worker message protocol and bridge for browser execution

## Required Files

```
packages/runtime-worker/src/index.ts
packages/runtime-worker/src/status-map.ts
packages/runtime-worker/src/utils.ts
packages/runtime-worker/src/commands.ts
packages/runtime-worker/src/worker-entry.ts
packages/runtime-worker/src/worker-bridge.ts
packages/runtime-worker/src/direct-adapter.ts
packages/runtime-worker/src/adapters/types.ts
packages/runtime-worker/src/adapters/typeberry.ts
packages/runtime-worker/src/adapters/ananas.ts
packages/runtime-worker/src/adapters/ananas-init.ts
packages/runtime-worker/src/adapters/ananas-shell.ts
```

## Sync Interpreter Contract

The worker-facing interpreter abstraction must be:

```ts
interface SyncPvmInterpreter {
  load(program: Uint8Array, initialState: InitialMachineState, loadContext?: ProgramLoadContext): void;
  reset(): void;
  step(n: number): { finished: boolean };
  getStatus(): number;
  getPc(): number;
  setPc(pc: number): void;
  getGas(): bigint;
  getRegisters(): Uint8Array;
  setRegisters(data: Uint8Array): void;
  setGas(gas: bigint): void;
  getMemory(address: number, length: number): Uint8Array;
  setMemory(address: number, data: Uint8Array): void;
  getExitArg(): number;
  shutdown(): void;
}
```

`reset()` must restore the full previous load, including `ProgramLoadContext`.

## Public Runtime API

Export:

- `TypeberrySyncInterpreter`
- `AnanasSyncInterpreter`
- `DirectAdapter`
- `WorkerBridge`
- `TimeoutError`
- `createWorkerCommandHandler()`
- `installWorkerEntry()`
- `mapStatus()`
- `getMemoryRange()`
- `serializeInitialState()`
- `deserializeInitialState()`
- `regsToUint8`
- `uint8ToRegs`

## Worker Protocol

Worker messages must use request/response correlation via `messageId`.

Commands:

- `load`
- `reset`
- `step`
- `getState`
- `getMemory`
- `setRegisters`
- `setPc`
- `setGas`
- `setMemory`
- `shutdown`

Rules:

1. All `bigint` values crossing the worker boundary must be serialized as decimal strings.
2. `Uint8Array` values may be transferred directly.
3. `load` must forward:
   - raw `program`
   - serialized `InitialMachineState`
   - optional `spiProgram`
   - optional `spiArgs`
4. Responses must carry either:
   - `type: "ok"` with a typed payload
   - `type: "error"` with a message

## Worker Bridge

`WorkerBridge` implements `PvmAdapter` on the main thread.

Requirements:

1. Correlate requests by `messageId`.
2. Apply a default timeout of `30000ms`.
3. Allow `step` to use a custom timeout override.
4. Reject timed-out commands with `TimeoutError`.
5. `setPc()` must be a real worker command, not local snapshot patching.
6. `setRegisters()` must validate indices and send a full 13-register byte buffer.

The bridge does not need to own worker creation. Accepting a worker-like instance is sufficient.

## Direct Adapter

`DirectAdapter` wraps a `SyncPvmInterpreter` and exposes the async `PvmAdapter` interface directly for Node.js and CLI usage.

It must behave the same as the worker bridge for:

- load
- reset
- step
- getState
- getMemory
- setRegisters
- setPc
- setGas
- setMemory
- shutdown

## Shared Utilities

`utils.ts` is the single source of truth for:

- `regsToUint8` and `uint8ToRegs` re-exports from `@pvmdbg/types`
- `getMemoryRange()`
- `serializeInitialState()`
- `deserializeInitialState()`
- register patch validation

`status-map.ts` must map:

- `255 -> "ok"`
- `0 -> "halt"`
- `1 -> "panic"`
- `2 -> "fault"`
- `3 -> "host"`
- `4 -> "out_of_gas"`

Unknown status codes must throw.

## Typeberry Adapter

Use `@typeberry/lib/pvm-interpreter`.

Requirements:

1. Generic loads must initialize `DebuggerAdapter.reset()` with:
   - program bytes
   - initial PC
   - initial gas
   - full registers
   - built memory
2. SPI loads must use `DebuggerAdapter.resetJAM()` when `loadContext.spiProgram` is present.
3. Typeberry does not require the Ananas priming step.
4. `getMemory()` must use page-based reads through `getPageDump()`.
5. Heap placement must be derived from the largest non-reserved memory gap instead of hardcoded SPI addresses.
6. Stored load parameters must include `program`, `initialState`, and `loadContext`.

## Ananas Adapter

Use `@fluffylabs/anan-as` and wrap it behind `AnanasSyncInterpreter`.

Requirements:

1. SPI loads must use `resetJAM()`.
2. Generic loads may use `resetGenericWithMemory()` even for empty page maps and chunks.
3. After every reset:
   - call `setNextProgramCounter(pc)`
   - call `setGasLeft(gas)`
   - call `nextStep()` once to prime state
4. `setRegisters()` must pass `Array.from(uint8Array)` because Ananas expects JS number arrays.
5. Page-map encoding for Ananas must use:
   - `1` for read-only pages
   - `3` for writable pages
6. Reset must fully reapply the previous load, including SPI context.

Using the package's inline WASM path is acceptable if it keeps Node tests and browser bundling working.

## Worker Entry

`worker-entry.ts` must expose a reusable command handler and worker installer rather than baking in a single interpreter choice.

Requirements:

1. Deserialize `SerializedInitialMachineState` before calling `load()`.
2. Re-serialize gas as decimal strings in all state-bearing responses.
3. Return structured error responses instead of throwing across the message boundary.

## Implementation Notes

1. Do not mock the real interpreters in integration tests.
2. Browser compatibility matters even if the worker bridge is injected rather than spawned internally.
3. Tests may use an in-memory worker harness for protocol verification as long as the underlying interpreter is real.
4. Package-local verification must build any workspace dependencies it relies on, especially `@pvmdbg/content`.

## Acceptance Criteria

- `mapStatus()` covers all six known statuses and throws on unknown codes.
- `regsToUint8` and `uint8ToRegs` roundtrip correctly through runtime-worker exports.
- `getMemoryRange()` correctly reads across page boundaries.
- `DirectAdapter` with Typeberry executes `fixtures/generic/add.pvm` correctly.
- `DirectAdapter` with Ananas executes `fixtures/generic/add.pvm` correctly.
- Typeberry and Ananas produce the same final state for `fixtures/generic/fibonacci.pvm`.
- Ananas respects writable page permissions for `fixtures/generic/store-u16.pvm`, proving the page-map encoding is correct.
- SPI `.jam` loads work on both interpreters using `loadContext.spiProgram` and `loadContext.spiArgs`.
- Ananas `reset()` restores the full SPI load context and reproduces the same post-reset step result as a fresh load.
- `setRegisters()` rejects indices `>= 13`.
- `WorkerBridge` applies real `setPc`, `setGas`, and `setRegisters` updates through the worker protocol.
- `WorkerBridge` rejects stalled commands with `TimeoutError`.
- `npm run build -w packages/runtime-worker` succeeds.
- `npm test -w packages/runtime-worker` succeeds.
- `npm run build` succeeds for the workspace.
- `npm test` succeeds for the workspace.
- `cd apps/web && npx vite build` succeeds, confirming the package remains browser-bundle-safe.

## Verification

```bash
npm run build -w packages/runtime-worker
npm test -w packages/runtime-worker
npm run build
npm test
cd apps/web && npx vite build
```
