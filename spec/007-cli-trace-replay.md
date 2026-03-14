# 007 - CLI Trace Replay

## Purpose

Implement `packages/cli` as a Node.js replay tool that validates the full debugger core outside the browser:

- reads ECALLI trace files from disk
- decodes the embedded program into a `ProgramEnvelope`
- replays the trace through the orchestrator with real direct adapters
- compares the final machine state exactly against the trace termination

## Required Files

```
packages/cli/src/index.ts
packages/cli/src/replay.ts
packages/cli/package.json
```

Additional package-local test config is acceptable if it keeps CLI tests isolated and reproducible.

## CLI Contract

Supported command:

```bash
pvmdbg replay <trace-file> [--pvm typeberry,ananas] [--timeout 30000] [--verbose]
```

Required options:

- `--pvm` for a comma-separated subset of `typeberry` and `ananas`
- `--timeout` for orchestrator step timeout in milliseconds
- `--verbose` to print host-call replay progress
- `--help` to print usage and exit successfully

The package must expose a single executable bin so `npx @pvmdbg/cli replay ...` works once published.

## Replay API

`replay.ts` must export:

- `replay(traceFile, options)`
- `allSessionsTerminal(snapshots)`
- `compareFinalState(snapshotWithLifecycle, trace)`

Suggested result shape:

```ts
interface ReplayResult {
  tracePath: string;
  trace: EcalliTrace;
  envelope: ProgramEnvelope;
  results: Map<string, ReplayPvmResult>;
}

interface ReplayPvmResult {
  pvmId: string;
  pvmName: string;
  lifecycle: PvmLifecycle;
  snapshot: MachineStateSnapshot;
  passed: boolean;
  mismatches: HostCallMismatch[];
}
```

## Replay Semantics

Replay flow:

1. Read the trace file asynchronously with `fs.readFile`.
2. Parse the trace with `@pvmdbg/trace`.
3. Build the program envelope with `@pvmdbg/content`.
4. Create a Node-safe orchestrator using `DirectAdapter` instances.
5. Support both `TypeberrySyncInterpreter` and `AnanasSyncInterpreter`.
6. Load the program into all requested PVMs.
7. Attach the reference trace to every session.
8. Loop with `orchestrator.step(1)` until `allSessionsTerminal()` returns true.
9. When a PVM pauses on a host call, resume it with the proposal taken from the trace-backed host-call info.
10. After all PVMs finish, compare final state against the trace termination with exact matching.

Loop termination must never depend on `results.size === 0`. Sessions paused on host calls are not terminal and must still keep the replay alive.

## Final State Comparison

`compareFinalState()` must produce structured `HostCallMismatch[]`.

Rules:

- compare lifecycle first; non-terminated PVMs fail immediately
- compare exact termination status with no tolerance
- compare exact PC
- compare exact gas
- compare all 13 registers
- treat registers omitted from the trace termination dump as expected `0n`

Gas tolerance is not allowed.

## Verbose Logging

`--verbose` should log at least:

- host-call index and resolved host-call name
- whether the trace proposal matched the live pause state
- terminal step summaries

The replay API should accept a logger callback so tests and the CLI entry point can control output separately.

## Error Handling

The CLI must surface clean failures for:

- missing trace file
- invalid trace parse
- unsupported CLI options
- invalid `--pvm` value
- invalid `--timeout` value
- missing host-call resume proposal
- PVM failure or timeout during replay

Exit code must be:

- `0` when all requested PVMs pass
- non-zero when any requested PVM fails or the command errors

## Acceptance Criteria

- `replay()` reads traces asynchronously and uses no browser APIs.
- Typeberry replay passes for `fixtures/io-trace-output.log`.
- Typeberry and Ananas both pass for `fixtures/trace-001.log`.
- The replay loop terminates through `allSessionsTerminal()`, not empty step results.
- Host-call resumes use the proposal carried by the orchestrator host-call info.
- `compareFinalState()` compares lifecycle, status, PC, gas, and all registers exactly.
- Final-state mismatches are reported as structured `HostCallMismatch` objects.
- The CLI supports `--pvm`, `--timeout`, `--verbose`, and `--help`.
- `packages/cli` builds to a runnable Node entry point with a bin declaration.
- Package tests include real integration replay of fixture traces through the full core stack.

## Verification

```bash
npm run build -w packages/cli
npm test -w packages/cli
node packages/cli/dist/index.js replay fixtures/trace-001.log
node packages/cli/dist/index.js replay fixtures/io-trace-output.log
npm run build
npm test
cd apps/web && npx vite build
```
