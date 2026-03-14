# PVM Debugger Rewrite Architecture

Last updated: 2026-03-12
Status: Refined draft — reflects all planning decisions including feedback from opus46/gpt54 test runs.

## 1. Goal

Rewrite the debugger from scratch with a clean architecture. Keep the UI conceptually similar but improved. Only retain essential features. No copy-paste from the current implementation; recreate behavior with clean code and better boundaries.

Reference code is available as git submodules:
- `reference/pvm-debugger/` — current production app (read for behavior, not for code reuse)
- `reference/shared-ui/` — shared UI component library

## 2. Confirmed Product Decisions

1. **No lockstep/independent mode in orchestrator.** The orchestrator exposes `step(n)` which dispatches to all active PVMs. The UI controls stepping granularity: calling `step(1)` gives lockstep behavior, `step(2**32)` gives run-to-completion. This simplifies the orchestrator API.

2. **PVM execution is independent from a reporting perspective:**
   - Each PVM reports its own post-step status.
   - One PVM pausing on host call does not block state reporting from others.
   - The UI may render partial results as PVMs complete at different speeds.

3. **Partial results are always valid:**
   - Timeouts, termination, and failures are per-PVM states.
   - Other PVMs continue progressing.

4. **Generic PVM defaults:**
   - Registers all zero, empty memory/page map, `pc = 0`.
   - Gas default is `1_000_000`.

5. **Manual input:** hex only in v1. Manual input editor exists only on load screen.

6. **URL loading:** the URL input fetches the URL content as a binary file. For GitHub URLs pointing to repository files (e.g., `github.com/org/repo/blob/main/file.jam`), rewrite to a raw content URL (`raw.githubusercontent.com/...`) before fetching. No `?program=0x...` query parameter parsing.

7. **Local storage persistence:**
   - Persist enough to auto-reload currently loaded program after refresh.
   - Reload behavior is equivalent to `Reset` (fresh initial state).
   - No named history.

8. **Post-load editor is postponed.**

9. **Orchestrator stepping contract:** `step(numberOfSteps)` returns `Promise<StepResult>` with per-PVM snapshots.

10. **UI stepping modes** (settings):
    - **Step** (n=1): single instruction, breakpoints enabled.
    - **Block**: step to next basic block boundary (calculated from disassembly). Breakpoints mapped to block starts.
    - **Step N**: user enters a custom number of steps (default: 10). Breakpoints NOT applied.
    - **Run**: keep invoking `step(n)` in a loop with the configured step size. Pauses on host call, breakpoint, or termination. UI refreshes between each batch.

11. **Host call handling:**
    - No modal dialog. Host call state lives in the bottom drawer's Host Call tab.
    - Drawer auto-opens to Host Call tab when a PVM pauses on ecalli.
    - **No separate "Resume" button.** The normal Step/Run/Block execution buttons resume the PVM after applying pending host call effects. This is the same UX as the current reference app.
    - Contextual host call UIs: gas (informative), fetch/lookup/read/write (high-level decoded view with editable storage table), log, generic fallback.
    - **Pending changes** from host call effects (register writes, memory writes, gas changes) are shown in the Registers panel with visual indicators before they are applied.
    - **Auto-continue**: when enabled and trace matches, the PVM resumes silently — no drawer open, no interruption. The host call is recorded in the trace log but execution continues.

12. **Trace replay continuation policy** (configurable in settings):
    - `always_continue`
    - `continue_when_trace_matches`
    - `never` (manual)

13. **Orchestrator produces ECALLI-compatible trace output per PVM.**

14. **API is internal first, but clean and package-ready.** Packages are `@pvmdbg/*`.

15. **Runtime boundary is JSON**; binary values encoded as `0x...` hex strings, bigints as decimal strings.

16. **Initial PVM focus:** `@typeberry/lib` (v0.5.9) and `ananas` (npm). PolkaVM deferred. No dynamically-loaded PVMs in v1.

17. **PVM selection lives in settings** (toggles, not multi-select). Small tabs in debugger header for switching viewed PVM. Divergence indicators shown inline next to tabs.

18. **Web workers** for browser PVM execution. Orchestrator must also work in Node.js (for CLI trace replay tool).

19. **Orchestrator is event-emitter based** with strictly typed events. The `step()` method is async and returns the final result; events provide intermediate updates.

20. **No Redux.** UI state managed via React hooks + orchestrator events.

21. **Shared-UI usage:**
    - `@fluffylabs/shared-ui` provides: Button, Input, Textarea, Alert, Badge, Checkbox, Switch, Dialog, DialogModal, Popover, DropdownMenu, Select, Tooltip, WithTooltip, Separator, ButtonGroup, Header, AppsSidebar, Content, DarkMode utilities.
    - Missing components needed: Tabs, Table, Drawer. Copy these from `reference/pvm-debugger/src/components/ui/` as starting points (they are Radix-based and not tightly coupled).
    - Styling: TailwindCSS v4.

## 3. Architecture Principles

- Browser-agnostic core for loading, parsing, orchestration, and trace logic.
- Web UI as a thin viewer/controller over orchestrator state.
- Per-PVM lifecycle isolation with deterministic status reporting.
- Strictly typed event-emitter pattern for orchestrator → UI communication.
- Clean package boundaries with explicit interface contracts.
- Real PVM interpreters from npm — no mocks in adapter packages.

## 4. Target Workspace Layout

```
@pvmdbg npm workspace:

packages/types          — shared domain types and interface contracts
packages/trace          — ECALLI trace parser, validator, serializer, comparator
packages/content        — source loading, format detection, JAM SPI decoding, ProgramEnvelope
packages/runtime-worker — browser web worker bridge (postMessage ↔ adapter calls)
packages/orchestrator   — multi-PVM orchestration, host calls, breakpoints, trace output
packages/cli            — Node.js CLI for trace replay using orchestrator directly
apps/web                — React UI viewer/controller
fixtures/               — example .jam programs, trace files (shared across packages)
```

## 5. Key Interface Contracts

These interfaces are defined in `packages/types` and consumed by all downstream packages. They MUST be implemented exactly as specified.

### 5.1 PVM Adapter Interface

```ts
/** Async adapter interface — wraps a PVM interpreter (may run in a web worker or directly). */
interface PvmAdapter {
  readonly pvmId: string;
  readonly pvmName: string;

  /** Load program and set initial state. */
  load(program: Uint8Array, initialState: InitialMachineState): Promise<void>;

  /** Reset to initial state (equivalent to load with same program). */
  reset(): Promise<void>;

  /** Execute n steps. Returns the state after stepping. */
  step(n: number): Promise<AdapterStepResult>;

  /** Get current machine state snapshot. */
  getState(): Promise<MachineStateSnapshot>;

  /** Get memory contents for a range. */
  getMemory(address: number, length: number): Promise<Uint8Array>;

  /** Set register values. */
  setRegisters(regs: Map<number, bigint>): Promise<void>;

  /** Set gas value. */
  setGas(gas: bigint): Promise<void>;

  /** Write to memory. */
  setMemory(address: number, data: Uint8Array): Promise<void>;

  /** Shut down the adapter and release resources. */
  shutdown(): Promise<void>;
}

interface AdapterStepResult {
  status: PvmStatus;
  pc: number;
  gas: bigint;
  /** Set when status is HOST — the ecalli operand index. */
  exitArg?: number;
}

type PvmStatus = "ok" | "halt" | "panic" | "fault" | "host" | "out_of_gas";
```

### 5.2 Initial Machine State

```ts
interface InitialMachineState {
  pc: number;
  gas: bigint;
  registers: bigint[];       // 13 entries
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
```

### 5.3 Machine State Snapshot

```ts
interface MachineStateSnapshot {
  pc: number;
  gas: bigint;
  status: PvmStatus;
  registers: bigint[];       // 13 entries
}
```

### 5.4 Orchestrator Events (Strictly Typed)

```ts
interface OrchestratorEvents {
  /** Emitted after each PVM completes its portion of a step batch. */
  pvmStateChanged: (pvmId: string, snapshot: MachineStateSnapshot, lifecycle: PvmLifecycle) => void;

  /** Emitted when a PVM hits an ecalli instruction. */
  hostCallPaused: (pvmId: string, info: HostCallInfo) => void;

  /** Emitted when a PVM reaches a terminal state. */
  terminated: (pvmId: string, reason: PvmStatus) => void;

  /** Emitted on adapter errors. */
  error: (pvmId: string, error: Error) => void;
}

type PvmLifecycle = "paused" | "running" | "paused_host_call" | "terminated" | "failed" | "timed_out";
```

**Lifecycle naming**: After loading a program, the PVM is in `"paused"` state (not "paused" or "running"). In the UI, this shows as "Paused". The user can edit registers, gas, PC, and memory while in `"paused"` state. Stepping transitions to `"running"` and back to `"paused"` (or a terminal state).

### 5.5 Program Envelope

```ts
interface ProgramEnvelope {
  programKind: "generic" | "jam_spi";
  programBytes: Uint8Array;
  initialState: InitialMachineState;
  metadata?: Uint8Array;
  spiEntrypoint?: SpiEntrypoint;
  trace?: EcalliTrace;
  expectedState?: ExpectedState;           // from JSON test vectors
  sourceMeta: { sourceKind: LoadSourceKind; sourceId: string };
}

/** Expected final state from JSON test vectors — used for post-execution validation. */
interface ExpectedState {
  status: string;
  pc: number;
  gas: bigint;
  registers: bigint[];
  memory: Array<{ address: number; data: Uint8Array }>;
}

type SpiEntrypoint = "refine" | "accumulate" | "is_authorized";
type LoadSourceKind = "example" | "url_payload" | "local_storage" | "upload" | "manual_input";
```

## 6. Loading and Format Pipeline

### 6.1 Source → Raw Bytes

Sources produce raw bytes + metadata about origin:

| Source | Input | Output |
|---|---|---|
| `example` | fixture ID from `fixtures/examples.json` | reads from `fixtures/` directory or fetches URL |
| `upload` | File object | `file.arrayBuffer()` |
| `manual_input` | hex string | hex decode |
| `url` | URL string | fetches URL content as binary. GitHub `blob` URLs rewritten to `raw.githubusercontent.com` |
| `local_storage` | key | read persisted payload |

### 6.2 Raw Bytes → Detection

Detection determines the container format:

| Container | Detection Rule |
|---|---|
| `trace_file` | text content contains `program 0x` |
| `json_test_vector` | text content parses as JSON with `"program"` and `"initial-regs"` fields |
| `jam_spi_with_metadata` | binary, first bytes decode as varU32 length + valid metadata |
| `jam_spi` | binary, passes SPI deblob |
| `generic_pvm` | binary fallback |

**VarU32 encoding** for metadata length prefix:
- `0x00..0x7F`: 1 byte, value is the byte itself
- `0x80..0xBF`: 2 bytes, `(byte0 & 0x3F) << 8 | byte1`
- `0xC0..0xDF`: 3 bytes, `(byte0 & 0x1F) << 16 | byte2 << 8 | byte1`
- `0xE0..0xEF`: 4 bytes, `(byte0 & 0x0F) << 24 | byte3 << 16 | byte2 << 8 | byte1`
- `0xF0..0xF7`: 5 bytes, `byte4 << 24 | byte3 << 16 | byte2 << 8 | byte1`

### 6.3 Detection → ProgramEnvelope

- **Trace file**: parse trace, extract program blob, initial state (pc/gas/regs), memory writes from prelude. Program blob is then decoded as SPI. **Traces are self-contained** — they include the program — and are loaded only in step 1 of the wizard (not separately per-PVM in settings). The trace applies to all PVMs.
- **JSON test vector**: parse JSON, extract `program` bytes array, `initial-regs`, `initial-pc`, `initial-gas`, `initial-page-map`, `initial-memory`. Produces a `ProgramEnvelope` with `generic` program kind. The `expected-*` fields are available for validation after execution.
- **JAM SPI with metadata**: strip varU32-length metadata prefix, decode SPI (produces code, memory, mask, jump table via deblob). Initial registers from SPI decode.
- **JAM SPI**: decode SPI directly.
- **Generic PVM**: use raw bytes as program. Apply defaults (zero regs, pc=0, gas=1M, empty memory).

### 6.4 Load Wizard (UI)

**Step 1:** Source selection (examples / upload / manual hex / URL). Examples are organized in 6 categories from `fixtures/examples.json`: Generic PVM, WAT→PVM, AssemblyScript→PVM, Large Programs, JSON Test Vectors, Trace Files. Each example card shows name, format badge, and file size. Examples with `entrypoint` pre-fill the SPI configuration. Some examples use `url` instead of `file` and must be fetched asynchronously.

**Step 2:** Detection preview + configuration. Shows:
- Detected format (generic / JAM SPI / SPI+metadata / trace / JSON test vector)
- Program details: binary size, code size, jump table entries, memory layout summary, initial registers preview
- Invalid program indication: if decoding fails, show a clear error instead of proceeding
- SPI entrypoint selection (Refine PC=0, Accumulate PC=5, Is Authorized PC=0) with two modes:
  - **Builder mode**: individual labeled parameter fields per entrypoint type
  - **RAW mode**: single hex textarea for direct entrypoint bytes input
  - Both modes stay in sync — editing one updates the other (same as reference app)
- **No gas editing here** — initial gas is editable in the debugger screen's registers panel after load
- For trace files: entrypoint/gas configuration is skipped (extracted from trace)

## 7. Orchestrator Model

### 7.1 API

```ts
class Orchestrator extends TypedEventEmitter<OrchestratorEvents> {
  constructor(config: OrchestratorConfig);

  /** Register a PVM adapter. */
  addPvm(adapter: PvmAdapter): void;
  removePvm(pvmId: string): void;

  /** Load program into all registered PVMs. */
  loadProgram(envelope: ProgramEnvelope): Promise<void>;

  /** Reset all PVMs to initial state. */
  reset(): Promise<void>;

  /** Step all active PVMs by n steps. Returns per-PVM results. */
  step(numberOfSteps: number): Promise<StepResult>;

  /** Set breakpoint addresses (applied to all PVMs). */
  setBreakpoints(addresses: number[]): void;

  /** Resume a PVM paused on host call with given effects. */
  resumeHostCall(pvmId: string, effects: HostCallResumeEffects): Promise<void>;

  /** Set the reference trace for host-call matching. */
  setTrace(pvmId: string, trace: EcalliTrace): void;

  /** Get recorded trace for a PVM. */
  getTrace(pvmId: string): EcalliTrace;

  /** Get current snapshots for all PVMs. */
  getSnapshots(): Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>;

  /** Shutdown all PVMs. */
  shutdown(): Promise<void>;
}
```

### 7.2 Per-PVM Lifecycle

States: `paused` → `running` → `paused` | `paused_host_call` | `terminated` | `failed` | `timed_out`

After `load()`, PVMs start in `paused` state. In the UI, this displays as "Paused". The user can edit registers, gas, PC, and memory while paused. Stepping transitions to `running` and back to `paused` (or a terminal/host-call state).

Terminal states: `terminated`, `failed`, `timed_out`. PVMs in terminal states return stable snapshots without re-executing.

### 7.3 Step Behavior

- `step(n)` dispatches to all non-terminal PVMs concurrently.
- Each PVM steps independently; timeout/failure in one does not block others.
- Events fire as each PVM completes: `pvmStateChanged`, `hostCallPaused`, `terminated`, `error`.
- The returned `Promise<StepResult>` resolves when ALL PVMs have completed their steps.
- When breakpoints are set, PVMs step one-at-a-time internally and check PC after each step.

## 8. Host Calls and Trace Replay

### 8.1 Host Call Flow

1. PVM hits ecalli → adapter returns `status: "host"` with `exitArg` (host call index).
2. Orchestrator transitions PVM to `paused_host_call`, emits `hostCallPaused` event.
3. Event payload includes: current state, host call index, resume proposal (from trace if available), mismatch diagnostics.
4. UI displays host call info in bottom drawer's Host Call tab (drawer auto-opens).
5. Based on auto-continue policy:
   - **Auto-continue enabled + trace matches**: PVM resumes silently — no drawer open, no interruption. Host call is recorded in trace log. Execution continues.
   - **Auto-continue disabled or no trace match**: UI pauses, drawer opens to Host Call tab. User reviews effects, then uses normal Step/Run/Block buttons to resume.
6. On next step action, UI calls `orchestrator.resumeHostCall(pvmId, effects)` with pending host call effects, then executes the requested step(s). **No separate "Resume" button** — the normal execution controls handle resumption.

### 8.2 Host Call Types (v1)

| Index | Name | UI Behavior |
|---|---|---|
| 0 | gas | Informative: shows current gas, r7 will receive new gas value |
| 1-4 | fetch/lookup/read/write | Storage: shows read key, editable storage table for write |
| 100 | log | Shows log message from memory |
| other | generic | Shows raw register state and allows manual editing |

### 8.3 Trace Entry Lookup Semantics

When building a resume proposal, the orchestrator matches trace entries by **sequential position** (the Nth host call encountered during execution matches the Nth entry in the reference trace). NOT by ecalli operand value, NOT by PC, NOT by gas. Sequential index is the only reliable key.

```ts
// Inside orchestrator session state:
private hostCallCounter: number = 0;  // incremented each time a host call is hit

// On host call:
const traceEntry = this.referenceTrace?.entries[this.hostCallCounter];
this.hostCallCounter++;
```

If the trace entry exists and the ecalli operand matches, `traceMatches: true`. If the operand doesn't match, `traceMatches: false` with a mismatch diagnostic. If no trace entry at that index, `resumeProposal` is undefined.

### 8.4 Host Call Resume Data Flow

The `setTrace()` method accepts an `EcalliTrace` (from `packages/trace`). This type must include the full parsed data needed for resume proposals:

```ts
interface EcalliTrace {
  prelude: TracePrelude;
  entries: TraceEntry[];        // sequential host call entries
  termination?: TraceTermination;
}

interface TraceEntry {
  ecalliIndex: number;          // host call operand
  pc: number;
  gas: bigint;
  registerWrites: Map<number, bigint>;     // register index → new value
  memoryReads: Array<{ address: number; data: Uint8Array }>;
  memoryWrites: Array<{ address: number; data: Uint8Array }>;
  gasAfter?: bigint;
}
```

The orchestrator builds `HostCallResumeProposal` directly from the `TraceEntry`:

```ts
function buildResumeProposal(entry: TraceEntry, currentState: MachineStateSnapshot): HostCallResumeProposal {
  return {
    registerWrites: entry.registerWrites,
    memoryWrites: entry.memoryWrites,
    gasAfter: entry.gasAfter,
    traceMatches: entry.ecalliIndex === currentExitArg,
    mismatches: computeMismatches(entry, currentState),
  };
}
```

### 8.5 Host Call Effects Per Type

These are the register/memory effects for each host call type. This information is critical for building the correct resume effects:

| Host Call | Index | Input Registers | Output Effects |
|---|---|---|---|
| **gas** | 0 | ω7 (gas context) | `ω7 ← remaining_gas`, `gas ← new_gas` |
| **fetch** | 1 | ω7-ω11 (fetch params) | Memory write at destination, register writes for status/length |
| **lookup** | 2 | ω7-ω9 (lookup params) | Memory write with result, register writes for status |
| **read** | 3 | ω7 (service ID), ω8 (key ptr), ω9 (key len) | Memory write with value at destination, `ω0 ← status` |
| **write** | 4 | ω7 (key ptr), ω8 (key len), ω9 (val ptr), ω10 (val len) | `ω7 ← prev_value_len or error`, updates storage |
| **log** | 100 | ω7 (level), ω8-ω9 (target), ω10-ω11 (message) | No state changes (read-only, display log) |

For **all host calls**, the exact effects are determined by the trace entry when available. When no trace is available, the UI falls back to the contextual host call handler which may prompt the user (for storage) or apply defaults (for gas/log).

### 8.6 Trace Output

- Orchestrator records host call entries and termination per PVM.
- Exportable as ECALLI-compatible trace text (JIP-6 format).

## 9. UI Architecture

### 9.1 Screens

1. **Load Wizard** (2 steps): source selection → detection preview + config
2. **Debugger**: 3-column layout + bottom drawer

### 9.2 Debugger Layout

```
┌─────────────────────────────────────────────────┐
│ Header (shared-ui) + PVM Tabs + Divergence      │
├──────────┬──────────────────┬───────────────────┤
│          │                  │                   │
│ Instruc- │  Registers +     │  Memory           │
│ tions    │  Status          │  Preview          │
│          │                  │                   │
│          │  [execution      │                   │
│          │   controls]      │                   │
│          │                  │                   │
├──────────┴──────────────────┴───────────────────┤
│ ▲ Bottom Drawer (drag handle)                   │
│ [Settings] [Trace Log] [Host Call]              │
│                                                 │
│ (content depends on active tab)                 │
└─────────────────────────────────────────────────┘
```

### 9.3 Bottom Drawer

- **Draggable** to resize space allocation between debugger and drawer.
- **Collapsible** into a thin row showing only tab buttons.
- **Auto-opens** to relevant tab (e.g., Host Call when ecalli is hit).

Tabs:
- **Settings**: PVM selection toggles (with hints for each), stepping mode (Step/Block/Step N — like reference app), trace auto-continue policy. **No trace file loading here** — traces are loaded in step 1 of the wizard. Each setting has a descriptive hint text.
- **Trace Log**: Two-column layout — left: execution trace produced by current run, right: loaded reference trace (if any). Visual comparison. Entries rendered in ECALLI format text. **Log statements** (host call 100) appear inline as readable text. Mismatch highlighting between columns.
- **Host Call**: Contextual host call UI with high-level decoded view (no raw register editing). Pending effects shown in registers panel. For gas: informative display. For storage: editable storage table. For log: message text display. No separate resume button.

### 9.4 Component Strategy

- Use `@fluffylabs/shared-ui` for: Header, AppsSidebar, Content, Button, Input, Textarea, Alert, Badge, Switch, Select, Dialog, Tooltip, Popover, DropdownMenu, Separator, DarkMode.
- Copy from `reference/pvm-debugger/src/components/ui/` for: Tabs, Table, Drawer (Radix-based, decoupled).
- Build fresh: Instructions panel, Registers panel, Memory panel, Load Wizard, Execution Controls, PVM tabs, Drawer tabs content.

## 10. CLI Trace Replay Tool

`packages/cli` — Node.js CLI that:
1. Reads a trace file from disk.
2. Extracts program + initial state.
3. Creates orchestrator with typeberry + ananas adapters (direct, no web workers).
4. Replays host calls from trace, applying resume effects.
5. Compares final state with trace's termination entry.
6. Reports pass/fail per PVM with mismatch details.

This validates that the orchestrator works without a browser and that the trace parser round-trips correctly.

## 11. Reference Code Index

All paths relative to `reference/pvm-debugger/src/`:

| Feature | Reference Files |
|---|---|
| Source/format loading | `components/ProgramLoader/loading-utils.ts`, `utils/spi.ts` |
| SPI entrypoint config | `components/ProgramLoader/spiConfig.ts`, `spiEncoding.ts` |
| Trace parsing | `lib/host-call-trace.ts` |
| Worker protocol | `packages/web-worker/worker.ts`, `types.ts`, `command-handlers/*` |
| Typeberry adapter | `packages/web-worker/pvm.ts` (uses `@typeberry/lib`) |
| WASM shells | `packages/web-worker/wasmBindgenShell.ts`, `wasmAsShell.ts` |
| Orchestration (Redux) | `store/workers/workersSlice.ts`, `hooks/useDebuggerActions.ts` |
| Instructions UI | `components/Instructions/*` |
| Registers UI | `components/Registers/index.tsx` |
| Memory UI | `components/MemoryPreview/*` |
| Host call dialog | `components/HostCallDialog/*` |
| PVM selection | `components/PvmSelect/index.tsx` |
| Debugger layout | `pages/DebuggerContent.tsx` |

## 12. Code Quality Guardrails

### 12.1 No Duplicate Utilities

Utility functions must be defined **once** in the appropriate package and imported elsewhere. Previous implementations had `hexToBytes` in 3 places, `getMemory` page logic in 3 places, and `HOST_CALL_NAMES` defined in 2 packages with conflicting values. Specifically:

- **Hex/bigint encoding**: `@pvmdbg/types` (encoding.ts) — `toHex`, `fromHex`, `bigintToDecStr`, `decStrToBigint`, `encodeVarU32`, `decodeVarU32`
- **Register byte conversion**: `@pvmdbg/types` — `regsToUint8` (bigint[] → Uint8Array 13×8 LE), `uint8ToRegs` (Uint8Array → bigint[])
- **HOST_CALL_NAMES map**: `@pvmdbg/trace` — single definition, imported by orchestrator and UI
- **Page-based memory access**: `@pvmdbg/runtime-worker` — `getMemoryRange(getPageDump, address, length)` helper, used by both adapters

If you need a utility, check if it already exists before creating a new one.

### 12.2 Breakpoint Performance

Breakpoint-aware stepping uses O(n) single-step loops (step 1 at a time, check PC). This is acceptable for v1. Do NOT implement batching strategies — keep it simple. For large step counts without breakpoints, use `adapter.step(n)` directly (the interpreter handles the loop internally and efficiently).

### 12.3 Fixture Bundling Strategy

Fixtures in `fixtures/` are loaded via **dynamic `import()`** with Vite's `?url` suffix for binary files, or `fetch()` at runtime for URL-based examples. Specifically:

```ts
// For bundled fixtures — use Vite's static asset handling
// In packages/content or apps/web:
const fixtureUrl = new URL('../../fixtures/generic/add.pvm', import.meta.url);
const response = await fetch(fixtureUrl);
const bytes = new Uint8Array(await response.arrayBuffer());
```

The `fixtures/examples.json` manifest is imported as a regular JSON module. Binary fixture files (`.pvm`, `.jam`, `.bin`, `.log`, `.json`) are loaded asynchronously via `fetch()` using URLs resolved relative to the app root.

### 12.4 Test Expectations Per Package

Each package must have meaningful tests, not placeholders. Minimum test scenarios:

| Package | Required Test Scenarios |
|---|---|
| `types` | Hex/bigint roundtrips, varU32 all 5 size classes, register byte conversion roundtrip |
| `trace` | Parse each fixture trace file, serialize and re-parse (roundtrip), compare matching/mismatching entries |
| `content` | Detect each fixture format correctly, create envelope from each format, SPI entrypoint encoding roundtrip, GitHub URL rewriting |
| `runtime-worker` | Load + step a real fixture with Typeberry (verify state changes), same with Ananas, status mapping for all 6 statuses |
| `orchestrator` | Concurrent step (2 PVMs), breakpoint stop at exact PC, host call pause/resume with trace matching, error isolation (one PVM fails, other continues), trace recording roundtrip |
| `cli` | End-to-end replay of `fixtures/io-trace-output.log` with Typeberry — must report pass |

Tests with `expect(true).toBe(true)` or similar placeholders are NOT acceptable.

## 13. Visual Style Guide

The UI must match the density and professional feel of the current reference app (`reference/pvm-debugger/`). Study its actual rendered output for proportions and spacing.

### 12.0 Reference Screenshots

Screenshots of the current production app are in `docs/screenshots/`. These show the **current** design — the rewrite may differ in specifics, but should match the overall density, professionalism, and information layout.

| Screenshot | Shows |
|---|---|
| `1-loadscreen.png` | Load screen with example program pills, file upload, paste/upload tabs, format detection badges |
| `2-entrypoint.png` | SPI entrypoint builder mode — Accumulate selected, Timeslot/Service ID/Results fields, auto-generated arguments hex |
| `3-entrypoint-raw.png` | SPI entrypoint RAW mode — Manual Configuration with PC counter and hex Arguments field |
| `4-debugger.png` | Debugger 3-column layout — instructions with block folding, registers with ω notation, memory with Infinite/Ranges tabs |
| `5-host-call-fetch.png` | Host call dialog for fetch — decoded fetch kind, hex data, register details, Run/Step/Block buttons |
| `6-host-call-log.png` | Host call dialog for log — log level badge, decoded message text |

Key observations from the current design to preserve:
- **Example programs are teal pill/chip buttons** — compact, one-click to select
- **Entrypoint builder has auto-generated SPI arguments hex** shown below the form fields (stays in sync with RAW mode)
- **Instructions panel has block folding** with "Block N" headers showing instruction count per block
- **Controls are in a top bar** across the full width: Load, Reset, Run, Step, Block
- **Host call uses a modal-style overlay** with decoded high-level info (not raw registers). The rewrite moves this to the bottom drawer instead.
- **Run/Step/Block buttons appear in the host call dialog** — confirming no separate "Resume" button

### 12.1 Brand Colors

- **Primary**: FluffyLabs brand pink/magenta (`#E91E8C` or similar — check shared-ui theme variables)
- **Background**: dark theme default (`bg-background` from shared-ui). The app is primarily dark-themed.
- **Text**: high-contrast white/light gray on dark backgrounds. Mono font for all code values.
- **Accent colors**: green for OK/success, red for errors/panic, amber for warnings/divergence, yellow for host call states.

### 12.2 Typography and Density

- **Small font sizes**: the debugger is an information-dense tool. Use `text-xs` (12px) for register values, instruction rows, memory hex dumps. `text-sm` (14px) for labels and headers within panels.
- **Minimal padding**: tight spacing — `p-1` to `p-2` for cells, `gap-1` to `gap-2` between items. The reference app is notably dense.
- **Monospace everywhere** for code values: PC, gas, registers, memory addresses, hex bytes, instruction mnemonics. Use `font-mono`.
- **No excessive boxing**: avoid wrapping every section in bordered boxes. Use subtle separators or background color changes instead. The reference app uses minimal chrome.
- **Aligned column title heights**: all three main column headers should be at the same height. Use consistent panel header styling.

### 12.3 Interactive Elements

- **All clickable elements**: `cursor-pointer` CSS. This was missing in previous implementations.
- **Icons**: use `lucide-react` consistently (already a shared-ui dependency). Key icons:
  - Step: `StepForward`, Run: `Play`, Pause: `Pause`, Reset: `RotateCcw`, Back: `ArrowLeft`
  - Block step: `SkipForward`
  - Breakpoint: small red circle (CSS, not an icon)
- **Hex values**: always show `0x` prefix for hex numbers.
- **Logo**: include the FluffyLabs logo in the header (from shared-ui Header component).

### 12.4 Panel Layout

- Panels fill available space. No unnecessary whitespace.
- Each panel has a small header with the panel name, no oversized titles.
- Scrolling is per-panel, not page-level. The page itself should never scroll.
- The bottom drawer's collapsed state shows only the tab bar (~36px high).

### 12.5 E2E Testing

All UI tickets must include E2E test specifications. Tests should verify:
- Component renders without errors
- Key user interactions work (clicks, inputs, navigation)
- Integration with orchestrator (mock orchestrator for unit tests, real for E2E)
- Use Playwright or Vitest browser mode for E2E tests in `apps/web/e2e/`

## 14. Explicitly Deferred from V1

- Post-load program editor (Assembly and raw editor mode).
- Full per-field multi-PVM diff viewer.
- Dynamically loaded PVMs (URL/file upload WASM).
- PolkaVM adapter.
- Rich manual-input parsing beyond hex.
- WebSocket PVM connections.
