# 004 - Content Pipeline

## Purpose

Implement `packages/content` as the canonical source-loading and format-detection pipeline that converts user-provided bytes into a `ProgramEnvelope`.

## Required Files

```
packages/content/src/index.ts
packages/content/src/examples-manifest.ts
packages/content/src/program-envelope.ts
packages/content/src/detect.ts
packages/content/src/decode-generic.ts
packages/content/src/decode-json-test-vector.ts
packages/content/src/decode-spi.ts
packages/content/src/decode-trace.ts
packages/content/src/spi-entrypoint.ts
packages/content/src/sources/example.ts
packages/content/src/sources/upload.ts
packages/content/src/sources/manual-input.ts
packages/content/src/sources/url.ts
packages/content/src/sources/local-storage.ts
```

Internal helpers may be added if they preserve the public API and keep the package browser-safe outside explicit `file:` handling.

## Public API

Export:

- `loadExample(exampleId: string): Promise<RawPayload>`
- `loadUpload(file: File): Promise<RawPayload>`
- `loadManualInput(hexString: string): RawPayload`
- `loadUrl(url: string): Promise<RawPayload>`
- `loadLocalStorage(storage: Storage, key: string): RawPayload | null`
- `persistPayload(storage: Storage, key: string, payload: RawPayload): void`
- `clearPersistedPayload(storage: Storage, key: string): void`
- `rewriteGitHubBlobUrl(url: string): string`
- `detectFormat(bytes: Uint8Array): DetectedFormat`
- `canDecodeSpi(bytes: Uint8Array, withMetadata: boolean): boolean`
- `encodeSpiEntrypoint(params: SpiEntrypointParams): Uint8Array`
- `createProgramEnvelope(payload: RawPayload, options?: { entrypoint?: SpiEntrypointParams }): ProgramEnvelope`
- `getExamplesManifest()`
- `findExampleEntry(exampleId: string)`

## Source Adapters

`RawPayload` must contain:

```ts
interface RawPayload {
  sourceKind: LoadSourceKind;
  sourceId: string;
  bytes: Uint8Array;
}
```

Rules:

1. `loadExample()` resolves bundled fixture files from `fixtures/` and fetched examples from manifest URLs.
2. `loadUpload()` reads `File.arrayBuffer()`.
3. `loadManualInput()` hex-decodes user input and may strip whitespace.
4. `loadUrl()` fetches bytes after GitHub blob URL rewriting.
5. `loadLocalStorage()` restores persisted payloads and must return `sourceKind: "local_storage"`.
6. Persistence should store bytes losslessly. Hex encoding is acceptable.

## Example Manifest

`fixtures/examples.json` is the single source of truth for:

- example categories
- bundled file paths
- remote URLs
- generic initial-state overrides
- default SPI entrypoint presets

Generic example overrides must be applied when `createProgramEnvelope()` is called on payloads loaded through `loadExample()`.

SPI example entrypoints from the manifest must be converted into canonical `SpiEntrypointParams` and used as the default load arguments unless the caller provides an explicit override.

## GitHub URL Rewriting

Rewrite:

```txt
https://github.com/<owner>/<repo>/blob/<branch>/<path>
```

to:

```txt
https://raw.githubusercontent.com/<owner>/<repo>/<branch>/<path>
```

Only GitHub blob URLs should be rewritten. Other URLs must pass through unchanged.

## Format Detection

```ts
type DetectedFormat =
  | { kind: "trace_file"; text: string }
  | { kind: "json_test_vector"; data: JsonTestVector }
  | { kind: "jam_spi_with_metadata"; metadata: Uint8Array; spiPayload: Uint8Array }
  | { kind: "jam_spi"; payload: Uint8Array }
  | { kind: "generic_pvm"; payload: Uint8Array };
```

Detection order:

1. Try UTF-8 decode with `new TextDecoder("utf-8", { fatal: true })`.
2. If decoded text contains `program 0x`, classify as `trace_file`.
3. Otherwise try JSON parse and classify as `json_test_vector` only if the required test-vector fields exist.
4. Try varU32 metadata extraction. Only classify as `jam_spi_with_metadata` if the stripped payload passes an actual SPI decode attempt.
5. Try direct SPI decode.
6. Fallback to `generic_pvm`.

`canDecodeSpi()` must validate by actually attempting SPI decode in a `try/catch`. Heuristics based only on prefix length are not acceptable.

## JSON Test Vector Decoding

`fixtures/json/*.json` inputs must decode to:

- `programKind: "generic"`
- `programBytes = Uint8Array.from(data.program)`
- `initialState.pc = data["initial-pc"]`
- `initialState.gas = BigInt(data["initial-gas"])`
- `initialState.registers = data["initial-regs"].map(BigInt)`
- `initialState.pageMap` from `initial-page-map`
- `initialState.memoryChunks` from `initial-memory`
- `expectedState` populated from the `expected-*` fields

Expected status must be preserved exactly from the fixture, including non-halt outcomes such as `"panic"`.

## SPI Decoding

Use `@typeberry/lib/pvm-interpreter` for actual SPI decoding.

Rules:

1. Metadata-wrapped JAM blobs must preserve both the raw program bytes and the extracted metadata.
2. `ProgramEnvelope.loadContext` must contain:
   - `spiProgram.program` as the raw loaded JAM bytes
   - `spiProgram.hasMetadata`
   - `spiArgs`
3. SPI memory segments must be converted into:
   - aligned `PageMapEntry[]`
   - `MemoryChunk[]`
4. Page map entries must align to `pvm.spi.PAGE_SIZE` boundaries and deduplicate overlaps.
5. The initial PC must follow the selected entrypoint PC unless a trace prelude overrides it.
6. Default gas for non-trace loads is `1_000_000n`.

## SPI Entrypoint Encoding

Implement canonical parameter encoding without importing `@typeberry/lib/codec`.

Supported shapes:

```ts
type SpiEntrypointParams =
  | { entrypoint: "refine"; pc: 0; params: RefineParams }
  | { entrypoint: "accumulate"; pc: 5; params: AccumulateParams }
  | { entrypoint: "is_authorized"; pc: 0; params: IsAuthorizedParams };
```

Rules:

1. Use `encodeVarU32()` from `@pvmdbg/types`.
2. Encode blobs as `varU32(length) + raw bytes`.
3. `accumulate` encoding is `slot`, `id`, `results`.
4. `refine` encoding is `core`, `index`, `id`, `payload blob`, `package blob`.
5. `is_authorized` encoding is `core`.

## Generic Decoding

Generic PVM blobs must produce:

- `programKind: "generic"`
- default state of `pc = 0`
- `gas = 1_000_000n`
- 13 zero registers
- empty page map
- empty memory chunks

Generic decoding must accept `Partial<InitialMachineState>` overrides and merge them into those defaults.

## Trace Decoding

Trace files must:

1. Parse through `@pvmdbg/trace`.
2. Extract the embedded program from `trace.prelude.programHex`.
3. Build SPI args from prelude memory writes using the contiguous span from the first write to the last write.
4. Try SPI decoding first, then generic fallback.
5. Populate `envelope.trace`.
6. Preserve trace prelude PC and gas for the initial state.
7. Apply trace prelude register values over decoded defaults when present.

## Implementation Notes

1. `createProgramEnvelope()` must be synchronous. Do not mark it `async`.
2. Do not use Node.js path helpers such as `path`, `__dirname`, or `__filename` in shared content code.
3. Bundled example file loading must work in both:
   - Node-based tests using `file:` URLs
   - browser/Vite builds using asset URLs
4. Node-only file reading must be isolated to the `file:` branch so browser builds continue to bundle.
5. Importing the example manifest as JSON is acceptable, but NodeNext JSON import requirements must be satisfied.
6. Avoid duplicating hex, varU32, or trace parsing logic that already exists in `@pvmdbg/types` or `@pvmdbg/trace`.

## Acceptance Criteria

- All bundled `.jam` fixtures classify as `jam_spi_with_metadata`.
- Generic `.pvm` fixtures classify as `generic_pvm`.
- Trace fixtures classify as `trace_file`.
- Invalid UTF-8 binary data is not misdetected as trace text.
- Plain ASCII text without a trace structure falls back to `generic_pvm`.
- Metadata stripping supports multi-byte varU32 prefixes such as a 145-byte prefix encoded as `[0x80, 0x91]`.
- JSON test vectors decode into generic envelopes with the correct initial state and expected state.
- Generic example manifests override default registers, gas, and optional page map.
- SPI envelopes include metadata, `loadContext`, aligned page maps, and encoded SPI args.
- Trace-derived SPI envelopes include parsed trace data and trace-derived `spiArgs`.
- Local-storage restore returns a `RawPayload` with `sourceKind: "local_storage"`.
- GitHub blob URLs rewrite to raw URLs exactly.
- `encodeSpiEntrypoint()` produces correct blobs for at least:
  - `accumulate { slot: 42, id: 0, results: 0 } -> [0x2a, 0x00, 0x00]`
  - `refine { core: 1, index: 2, id: 3, payload: [0xaa], package: [0xbb, 0xcc] } -> [0x01, 0x02, 0x03, 0x01, 0xaa, 0x02, 0xbb, 0xcc]`
- `createProgramEnvelope()` returns a plain `ProgramEnvelope`, not a `Promise`.
- `npm run build -w packages/content` succeeds.
- `npm test -w packages/content` succeeds.
- `npm run build` succeeds for the workspace.
- `npm test` succeeds for the workspace.
- `cd apps/web && npx vite build` succeeds, confirming the content package remains browser-bundle-safe.

## Verification

```bash
npm run build -w packages/content
npm test -w packages/content
npm run build
npm test
cd apps/web && npx vite build
```
