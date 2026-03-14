# 002 - Types and Interface Contracts

## Purpose

Define the canonical shared domain model in `packages/types`. All downstream packages must import these contracts instead of duplicating them.

## Required Files

```
packages/types/src/index.ts
packages/types/src/pvm-adapter.ts
packages/types/src/machine-state.ts
packages/types/src/pvm-status.ts
packages/types/src/program.ts
packages/types/src/orchestrator.ts
packages/types/src/encoding.ts
packages/types/src/trace-types.ts
```

## Canonical Contracts

### PVM adapter

```ts
interface PvmAdapter {
  readonly pvmId: string;
  readonly pvmName: string;
  load(program: Uint8Array, initialState: InitialMachineState, loadContext?: ProgramLoadContext): Promise<void>;
  reset(): Promise<void>;
  step(n: number): Promise<AdapterStepResult>;
  getState(): Promise<MachineStateSnapshot>;
  getMemory(address: number, length: number): Promise<Uint8Array>;
  setRegisters(regs: Map<number, bigint>): Promise<void>;
  setPc(pc: number): Promise<void>;
  setGas(gas: bigint): Promise<void>;
  setMemory(address: number, data: Uint8Array): Promise<void>;
  shutdown(): Promise<void>;
}

interface AdapterStepResult {
  status: PvmStatus;
  pc: number;
  gas: bigint;
  exitArg?: number;
}
```

### Machine state

```ts
interface InitialMachineState {
  pc: number;
  gas: bigint;
  registers: bigint[];
  pageMap: PageMapEntry[];
  memoryChunks: MemoryChunk[];
}

interface PageMapEntry {
  address: number;
  length: number;
  isWritable: boolean;
}

interface MemoryChunk {
  address: number;
  data: Uint8Array;
}

interface MachineStateSnapshot {
  pc: number;
  gas: bigint;
  status: PvmStatus;
  registers: bigint[];
}
```

### PVM status and lifecycle

```ts
type PvmStatus = "ok" | "halt" | "panic" | "fault" | "host" | "out_of_gas";

type PvmLifecycle = "paused" | "running" | "paused_host_call" | "terminated" | "failed" | "timed_out";
```

After `load()` or `reset()`, the lifecycle is `"paused"`. The UI treats that state as editable.

### Program envelope

```ts
interface SpiProgram {
  program: Uint8Array;
  hasMetadata: boolean;
}

interface ProgramLoadContext {
  spiProgram?: SpiProgram;
  spiArgs?: Uint8Array;
}

interface ExpectedState {
  status: string;
  pc: number;
  gas: bigint;
  registers: bigint[];
  memory: Array<{ address: number; data: Uint8Array }>;
}

interface ProgramEnvelope {
  programKind: "generic" | "jam_spi";
  programBytes: Uint8Array;
  initialState: InitialMachineState;
  metadata?: Uint8Array;
  spiEntrypoint?: SpiEntrypoint;
  loadContext?: ProgramLoadContext;
  trace?: EcalliTrace;
  expectedState?: ExpectedState;
  sourceMeta: { sourceKind: LoadSourceKind; sourceId: string };
}
```

```ts
type SpiEntrypoint = "refine" | "accumulate" | "is_authorized";
type LoadSourceKind = "example" | "url_payload" | "local_storage" | "upload" | "manual_input";
```

### Orchestrator-facing types

```ts
interface HostCallMismatch {
  field: string;
  expected: string;
  actual: string;
}

interface HostCallResumeEffects {
  registerWrites?: Map<number, bigint>;
  memoryWrites?: Array<{ address: number; data: Uint8Array }>;
  gasAfter?: bigint;
}

interface HostCallResumeProposal {
  registerWrites: Map<number, bigint>;
  memoryWrites: Array<{ address: number; data: Uint8Array }>;
  gasAfter?: bigint;
  traceMatches: boolean;
  mismatches: HostCallMismatch[];
}

interface HostCallInfo {
  pvmId: string;
  hostCallIndex: number;
  hostCallName: string;
  currentState: MachineStateSnapshot;
  resumeProposal?: HostCallResumeProposal;
}

interface PvmStepReport {
  pvmId: string;
  lifecycle: PvmLifecycle;
  snapshot: MachineStateSnapshot;
  stepsExecuted: number;
  hitBreakpoint: boolean;
  hostCall?: HostCallInfo;
}

interface StepResult {
  results: Map<string, PvmStepReport>;
}

interface OrchestratorEvents {
  pvmStateChanged: (pvmId: string, snapshot: MachineStateSnapshot, lifecycle: PvmLifecycle) => void;
  hostCallPaused: (pvmId: string, info: HostCallInfo) => void;
  terminated: (pvmId: string, reason: PvmStatus) => void;
  error: (pvmId: string, error: Error) => void;
}
```

### Canonical trace model

The trace types live in `packages/types`, not `packages/trace`, to avoid circular dependencies.

```ts
interface TracePrelude {
  programHex: string;
  memoryWrites: Array<{ address: number; dataHex: string }>;
  startPc: number;
  startGas: bigint;
  startRegisters: Map<number, bigint>;
}

interface TraceEntry {
  index: number;
  pc: number;
  gas: bigint;
  registers: Map<number, bigint>;
  memoryReads: Array<{ address: number; length: number; dataHex: string }>;
  memoryWrites: Array<{ address: number; dataHex: string }>;
  registerWrites: Map<number, bigint>;
  gasAfter?: bigint;
}

interface TraceTermination {
  kind: "halt" | "panic" | "fault" | "oog";
  arg?: number;
  pc: number;
  gas: bigint;
  registers: Map<number, bigint>;
}

interface EcalliTrace {
  prelude: TracePrelude;
  entries: TraceEntry[];
  termination?: TraceTermination;
}
```

## Encoding Helpers

Provide:

```ts
function toHex(bytes: Uint8Array): string;
function fromHex(hex: string): Uint8Array;
function bigintToDecStr(value: bigint): string;
function decStrToBigint(str: string): bigint;
function encodeVarU32(v: number): Uint8Array;
function decodeVarU32(bytes: Uint8Array, offset?: number): { value: number; bytesRead: number };
function regsToUint8(regs: bigint[]): Uint8Array;
function uint8ToRegs(bytes: Uint8Array): bigint[];
```

`regsToUint8` and `uint8ToRegs` must use `DataView.setBigUint64` and `DataView.getBigUint64` with little-endian ordering.

## Validation Rules

1. `fromHex` accepts `0x...` and raw hex.
2. `fromHex` rejects:
   - non-hex characters
   - odd-length strings
3. `decStrToBigint` rejects non-decimal strings.
4. `encodeVarU32` rejects:
   - `NaN`
   - non-integers
   - values outside `0..0xffffffff`
5. `uint8ToRegs` requires exactly 104 bytes.
6. `regsToUint8` requires exactly 13 registers.

## VarU32 Rules

Encoding classes:

- `0x00..0x7f`: 1 byte
- `0x80..0xbf`: 2 bytes
- `0xc0..0xdf`: 3 bytes
- `0xe0..0xef`: 4 bytes
- `0xf0..0xf7`: 5 bytes

Critical detail:

- The 5-byte lead byte is `0xf0 | ((value >> 28) & 0x07)`.
- The 5-byte decoder must coerce the final value back to an unsigned 32-bit number. Plain JavaScript bitwise composition returns signed results above `0x7fffffff`.

## Implementation Notes

1. `setPc` belongs in the canonical adapter interface from the start. Do not treat PC edits as snapshot-only mutations.
2. Keep `ProgramLoadContext` in the shared contract layer so SPI-aware adapters can preserve `resetJAM` context across reset.
3. Add a package-local Vitest config or equivalent stable wiring so `npm test -w packages/types` works from the package directory without depending on root workspace glob behavior.
4. Re-export the full public surface from `src/index.ts`. Downstream packages should not need deep import paths for core shared types.

## Acceptance Criteria

- All interfaces above are present in `packages/types`.
- `src/index.ts` re-exports the full public surface.
- `toHex` and `fromHex` roundtrip empty, one-byte, and multi-kilobyte payloads.
- `fromHex` rejects invalid characters with a clear error.
- `bigintToDecStr` and `decStrToBigint` roundtrip `0`, `1`, and `2^64 - 1`.
- `encodeVarU32` and `decodeVarU32` roundtrip:
  - `0`
  - `127`
  - `128`
  - `145`
  - `16383`
  - `16384`
  - `2097151`
  - `2097152`
  - `268435455`
  - `268435456`
  - `4294967295`
- `encodeVarU32(0x1fffffff)` yields a lead byte of `0xf1`.
- `encodeVarU32(0xffffffff)` yields a lead byte of `0xf7`.
- `decodeVarU32(encodeVarU32(0xffffffff)).value` is `4294967295`, not `-1`.
- `regsToUint8` and `uint8ToRegs` roundtrip mixed register values including `0xffffffffffffffffn`.
- `encodeVarU32(NaN)` and `encodeVarU32(1.5)` throw errors.
- `npm run build -w packages/types` succeeds.
- `npm test -w packages/types` succeeds.

## Verification

```bash
npm run build -w packages/types
npm test -w packages/types
```
