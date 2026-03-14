# 003 - ECALLI Trace Parser

## Purpose

Implement `packages/trace` as the canonical package for parsing, serializing, comparing, and inspecting ECALLI traces in JIP-6 text format.

## Required Files

```
packages/trace/src/index.ts
packages/trace/src/types.ts
packages/trace/src/parser.ts
packages/trace/src/serializer.ts
packages/trace/src/comparator.ts
packages/trace/src/host-call-names.ts
```

## Canonical Responsibilities

The package must:

1. Parse JIP-6 trace text into `EcalliTrace`.
2. Serialize `EcalliTrace` back into canonical JIP-6 text.
3. Compare two traces thoroughly and return structured mismatch diagnostics.
4. Expose the single source of truth for host call names.
5. Provide a helper for converting trace memory writes from hex into bytes.

All trace model types come from `@pvmdbg/types` and must be re-exported from this package.

## Public API

Export:

- `parseTrace(text: string): EcalliTrace`
- `serializeTrace(trace: EcalliTrace): string`
- `compareTraces(a: EcalliTrace, b: EcalliTrace): TraceMismatch[]`
- `traceMemoryWriteToBytes(write): { address: number; data: Uint8Array }`
- `getHostCallName(index: number): string`
- `HOST_CALL_NAMES`
- `EcalliTrace`
- `TracePrelude`
- `TraceEntry`
- `TraceTermination`
- `TraceMismatch`

## Host Call Name Table

```ts
const HOST_CALL_NAMES: Record<number, string> = {
  0: "gas",
  1: "fetch",
  2: "lookup",
  3: "read",
  4: "write",
  5: "info",
  6: "bless",
  7: "checkpoint",
  8: "new",
  9: "upgrade",
  10: "transfer",
  11: "quit",
  12: "solicit",
  13: "forget",
  15: "historical_lookup",
  16: "import",
  17: "export",
  18: "machine",
  100: "log"
};
```

Unknown host call indices must return a deterministic fallback string such as `unknown(999)`.

## Supported Trace Syntax

### Prelude

```txt
program 0x<hex>
memwrite 0x<address> len=<length> <- 0x<hex>
start pc=<pc> gas=<gas> [r00=0x<hex> ...]
```

### Host call entry

```txt
ecalli=<index> pc=<pc> gas=<gas> [r00=0x<hex> ...]
memread 0x<address> len=<length> -> 0x<hex>
memwrite 0x<address> len=<length> <- 0x<hex>
setreg r<idx> <- 0x<hex>
setgas <- <gas>
```

### Termination

```txt
HALT pc=<pc> gas=<gas> [r00=0x<hex> ...]
PANIC=<arg> pc=<pc> gas=<gas> [r00=0x<hex> ...]
FAULT=<arg> pc=<pc> gas=<gas> [r00=0x<hex> ...]
OOG pc=<pc> gas=<gas> [r00=0x<hex> ...]
```

## Parser Rules

1. `program` and `start` are mandatory.
2. `PANIC` must be matched as `PANIC=` exactly.
3. `FAULT` must be parsed into `TraceTermination.kind === "fault"`.
4. `memread` and `memwrite` lengths must match the decoded hex payload length.
5. `setreg`, `setgas`, and `memread` are only valid inside a host call entry.
6. Trace parsing should be strict about recognized trace lines, but it may ignore unrelated wrapper lines around the trace.

## Wrapped Log Support

Real fixtures may contain traces embedded in runner output with prefixes like:

```txt
TRACE [  ecalli] ecalli=1 pc=...
```

The parser must strip the prefix and parse the remainder as a normal trace line. Unrelated non-trace lines around the wrapped trace should be ignored.

This is required for `fixtures/io-trace-output.log`.

## Serializer Rules

1. Output canonical JIP-6 lines without runner prefixes.
2. Omit zero-valued registers from all register dumps.
3. Serialize termination kinds exhaustively:
   - `halt`
   - `panic`
   - `fault`
   - `oog`
4. Preserve semantic roundtrip equality:
   - `parseTrace(serializeTrace(parseTrace(input)))` must match the parsed structure.

## Comparator Rules

Comparison must cover:

1. Prelude:
   - `programHex`
   - `memoryWrites`
   - `startPc`
   - `startGas`
   - `startRegisters`
2. Every entry:
   - `index`
   - `pc`
   - `gas`
   - `registers`
   - `memoryReads`
   - `memoryWrites`
   - `registerWrites`
   - `gasAfter`
3. Termination:
   - presence
   - `kind`
   - `arg`
   - `pc`
   - `gas`
   - `registers`

Mismatch results should include field-level context and a stable path such as `entries[3].memoryReads[0].dataHex`.

## Helper Rules

`traceMemoryWriteToBytes` must decode trace memory write hex using `fromHex` from `@pvmdbg/types`. Do not duplicate hex-decoding logic in this package or downstream packages.

## Implementation Notes

1. Keep `HOST_CALL_NAMES` and `getHostCallName()` in this package only. Other packages import from here.
2. The parser must be fixture-driven. `fixtures/trace-001.log` is a pure trace; `fixtures/io-trace-output.log` is wrapped in test-runner output.
3. Package-only builds must have a reliable way to resolve `@pvmdbg/types` without depending on ad hoc generated source artifacts. Building `packages/types` first is acceptable if direct source aliasing conflicts with package `rootDir` boundaries.

## Acceptance Criteria

- `fixtures/trace-001.log` parses successfully.
- `fixtures/io-trace-output.log` parses successfully.
- `FAULT` lines parse into `TraceTermination.kind === "fault"`.
- The parser throws when `program` is missing.
- The parser throws when `start` is missing.
- The parser throws when `len=` does not match decoded hex length.
- The serializer omits zero-valued registers.
- The serializer roundtrips both fixtures through parse -> serialize -> parse.
- The comparator returns no mismatches for identical traces.
- The comparator reports entry-level mismatches for modified memory reads/writes and gas values.
- `traceMemoryWriteToBytes` converts `{ address, dataHex }` into `{ address, data }`.
- `getHostCallName(100)` returns `"log"`.
- Unknown host call indices return a stable fallback string.
- `npm run build -w packages/trace` succeeds.
- `npm test -w packages/trace` succeeds.

## Verification

```bash
npm run build -w packages/trace
npm test -w packages/trace
```
