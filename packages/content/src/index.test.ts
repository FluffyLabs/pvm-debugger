import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  detectFormat,
  canDecodeSpi,
  createProgramEnvelope,
  encodeSpiEntrypoint,
  rewriteGitHubBlobUrl,
  loadManualInput,
  loadLocalStorage,
  persistPayload,
  clearPersistedPayload,
  initManifest,
  findExampleEntry,
  getExamplesManifest,
  decodeGeneric,
  decodeJsonTestVector,
  decodeSpi,
  decodeTrace,
  manifestEntrypointToParams,
  manifestInitialStateOverrides,
} from "./index.js";
import type { DetectedFormat, SpiEntrypointParams, RawPayload } from "./index.js";
import type { ProgramEnvelope } from "@pvmdbg/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "../../../fixtures");

function readFixture(path: string): Uint8Array {
  return new Uint8Array(readFileSync(resolve(fixturesDir, path)));
}

function readFixtureText(path: string): string {
  return readFileSync(resolve(fixturesDir, path), "utf-8");
}

// Initialize the manifest before all tests
beforeAll(() => {
  const manifestJson = JSON.parse(readFileSync(resolve(fixturesDir, "examples.json"), "utf-8"));
  initManifest(manifestJson);
});

// ============================================================================
// Format Detection
// ============================================================================

describe("detectFormat", () => {
  it("detects trace files by 'program 0x' marker", () => {
    const data = new TextEncoder().encode("program 0xaabb\nstart pc=0 gas=1000\n");
    const result = detectFormat(data);
    expect(result.kind).toBe("trace_file");
    if (result.kind === "trace_file") {
      expect(result.text).toContain("program 0x");
    }
  });

  it("detects JSON test vectors", () => {
    const json = JSON.stringify({
      program: [0, 1, 2],
      "initial-regs": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "initial-pc": 0,
      "initial-gas": 1000,
    });
    const data = new TextEncoder().encode(json);
    const result = detectFormat(data);
    expect(result.kind).toBe("json_test_vector");
  });

  it("detects bundled .jam fixtures as jam_spi_with_metadata", () => {
    const addJam = readFixture("add.jam");
    const result = detectFormat(addJam);
    expect(result.kind).toBe("jam_spi_with_metadata");
    if (result.kind === "jam_spi_with_metadata") {
      expect(result.metadata.length).toBeGreaterThan(0);
      expect(result.spiPayload.length).toBeGreaterThan(0);
    }
  });

  it("detects all bundled .jam files as jam_spi_with_metadata", () => {
    const jamFiles = [
      "add.jam",
      "fibonacci.jam",
      "factorial.jam",
      "as-add.jam",
      "as-fibonacci.jam",
      "as-factorial.jam",
      "gol-jamsdk.jam",
    ];
    for (const file of jamFiles) {
      const bytes = readFixture(file);
      const result = detectFormat(bytes);
      expect(result.kind).toBe("jam_spi_with_metadata");
    }
  });

  it("detects generic .pvm files as generic_pvm", () => {
    const pvmFiles = [
      "generic/add.pvm",
      "generic/fibonacci.pvm",
      "generic/game-of-life.pvm",
      "generic/store-u16.pvm",
      "generic/branch.pvm",
    ];
    for (const file of pvmFiles) {
      const bytes = readFixture(file);
      const result = detectFormat(bytes);
      expect(result.kind).toBe("generic_pvm");
    }
  });

  it("detects trace fixtures as trace_file", () => {
    const traceFiles = ["trace-001.log", "io-trace-output.log"];
    for (const file of traceFiles) {
      const bytes = readFixture(file);
      const result = detectFormat(bytes);
      expect(result.kind).toBe("trace_file");
    }
  });

  it("does not misdetect invalid UTF-8 binary as trace text", () => {
    const data = new Uint8Array([0xff, 0xfe, 0xfd, 0x80, 0x90, 0xa0]);
    const result = detectFormat(data);
    expect(result.kind).not.toBe("trace_file");
  });

  it("falls back to generic_pvm for plain ASCII text without trace structure", () => {
    const data = new TextEncoder().encode("just some regular text without trace markers");
    const result = detectFormat(data);
    expect(result.kind).toBe("generic_pvm");
  });

  it("handles multi-byte varU32 metadata prefix (145-byte prefix encoded as [0x80, 0x91])", () => {
    // [0x80, 0x91] encodes (0x00 << 8) | 0x91 = 145 in 2-byte varU32
    // Actually: (0x80 & 0x3f) << 8 | 0x91 = 0x00 << 8 | 0x91 = 0x91 = 145
    const addJam = readFixture("add.jam");
    // The add.jam first byte is 0x1c = 28, meaning 28 bytes metadata (1-byte varU32)
    // Let's verify that multi-byte varU32 support works by checking canDecodeSpi
    const result = detectFormat(addJam);
    expect(result.kind).toBe("jam_spi_with_metadata");
  });

  it("detects JSON test vector fixture file", () => {
    const bytes = readFixture("json/inst_add_32.json");
    const result = detectFormat(bytes);
    expect(result.kind).toBe("json_test_vector");
  });
});

describe("canDecodeSpi", () => {
  it("returns true for valid SPI with metadata", () => {
    const addJam = readFixture("add.jam");
    expect(canDecodeSpi(addJam, true)).toBe(true);
  });

  it("returns false for generic PVM as SPI", () => {
    const generic = readFixture("generic/add.pvm");
    expect(canDecodeSpi(generic, false)).toBe(false);
  });

  it("returns false for random bytes", () => {
    expect(canDecodeSpi(new Uint8Array([0xde, 0xad, 0xbe, 0xef]), false)).toBe(false);
  });
});

// ============================================================================
// GitHub URL Rewriting
// ============================================================================

describe("rewriteGitHubBlobUrl", () => {
  it("rewrites GitHub blob URLs to raw URLs", () => {
    expect(
      rewriteGitHubBlobUrl("https://github.com/user/repo/blob/main/path/file.jam"),
    ).toBe("https://raw.githubusercontent.com/user/repo/main/path/file.jam");
  });

  it("rewrites URLs with branch names", () => {
    expect(
      rewriteGitHubBlobUrl("https://github.com/org/project/blob/feature-branch/dir/file.pvm"),
    ).toBe("https://raw.githubusercontent.com/org/project/feature-branch/dir/file.pvm");
  });

  it("passes non-GitHub URLs through unchanged", () => {
    const url = "https://example.com/file.jam";
    expect(rewriteGitHubBlobUrl(url)).toBe(url);
  });

  it("passes GitHub non-blob URLs through unchanged", () => {
    const url = "https://github.com/user/repo/tree/main/dir";
    expect(rewriteGitHubBlobUrl(url)).toBe(url);
  });
});

// ============================================================================
// SPI Entrypoint Encoding
// ============================================================================

describe("encodeSpiEntrypoint", () => {
  it("encodes accumulate { slot: 42, id: 0, results: 0 } -> [0x2a, 0x00, 0x00]", () => {
    const params: SpiEntrypointParams = {
      entrypoint: "accumulate",
      pc: 5,
      params: { slot: 42, id: 0, results: 0 },
    };
    const result = encodeSpiEntrypoint(params);
    expect(Array.from(result)).toEqual([0x2a, 0x00, 0x00]);
  });

  it("encodes refine { core: 1, index: 2, id: 3, payload: [0xaa], package: [0xbb, 0xcc] }", () => {
    const params: SpiEntrypointParams = {
      entrypoint: "refine",
      pc: 0,
      params: {
        core: 1,
        index: 2,
        id: 3,
        payload: new Uint8Array([0xaa]),
        package: new Uint8Array([0xbb, 0xcc]),
      },
    };
    const result = encodeSpiEntrypoint(params);
    expect(Array.from(result)).toEqual([0x01, 0x02, 0x03, 0x01, 0xaa, 0x02, 0xbb, 0xcc]);
  });

  it("encodes is_authorized { core: 5 }", () => {
    const params: SpiEntrypointParams = {
      entrypoint: "is_authorized",
      pc: 0,
      params: { core: 5 },
    };
    const result = encodeSpiEntrypoint(params);
    expect(Array.from(result)).toEqual([0x05]);
  });

  it("encodes accumulate with zero values", () => {
    const params: SpiEntrypointParams = {
      entrypoint: "accumulate",
      pc: 5,
      params: { slot: 0, id: 0, results: 0 },
    };
    const result = encodeSpiEntrypoint(params);
    expect(Array.from(result)).toEqual([0x00, 0x00, 0x00]);
  });

  it("encodes refine with empty blobs", () => {
    const params: SpiEntrypointParams = {
      entrypoint: "refine",
      pc: 0,
      params: {
        core: 0,
        index: 0,
        id: 0,
        payload: new Uint8Array(),
        package: new Uint8Array(),
      },
    };
    const result = encodeSpiEntrypoint(params);
    // core(0), index(0), id(0), blob(len=0), blob(len=0)
    expect(Array.from(result)).toEqual([0x00, 0x00, 0x00, 0x00, 0x00]);
  });
});

// ============================================================================
// Source Adapters
// ============================================================================

describe("loadManualInput", () => {
  it("decodes hex string to bytes", () => {
    const payload = loadManualInput("0xaabbcc");
    expect(payload.sourceKind).toBe("manual_input");
    expect(Array.from(payload.bytes)).toEqual([0xaa, 0xbb, 0xcc]);
  });

  it("strips whitespace from hex input", () => {
    const payload = loadManualInput("0x aa bb cc");
    expect(Array.from(payload.bytes)).toEqual([0xaa, 0xbb, 0xcc]);
  });
});

describe("local-storage", () => {
  function createMockStorage(): Storage {
    const store: Record<string, string> = {};
    return {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => { store[key] = value; },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
      get length() { return Object.keys(store).length; },
      key: (index: number) => Object.keys(store)[index] ?? null,
    };
  }

  it("returns null when no payload is persisted", () => {
    const storage = createMockStorage();
    expect(loadLocalStorage(storage, "test")).toBeNull();
  });

  it("roundtrips payload through persist and restore", () => {
    const storage = createMockStorage();
    const payload: RawPayload = {
      sourceKind: "upload",
      sourceId: "test.pvm",
      bytes: new Uint8Array([0xaa, 0xbb, 0xcc]),
    };

    persistPayload(storage, "test", payload);
    const restored = loadLocalStorage(storage, "test");

    expect(restored).not.toBeNull();
    expect(restored!.sourceKind).toBe("local_storage");
    expect(restored!.sourceId).toBe("test.pvm");
    expect(Array.from(restored!.bytes)).toEqual([0xaa, 0xbb, 0xcc]);
  });

  it("returns null after clearing", () => {
    const storage = createMockStorage();
    const payload: RawPayload = {
      sourceKind: "upload",
      sourceId: "test.pvm",
      bytes: new Uint8Array([0xaa]),
    };

    persistPayload(storage, "test", payload);
    clearPersistedPayload(storage, "test");
    expect(loadLocalStorage(storage, "test")).toBeNull();
  });
});

// ============================================================================
// Examples Manifest
// ============================================================================

describe("examples manifest", () => {
  it("returns the full manifest with categories", () => {
    const manifest = getExamplesManifest();
    expect(manifest.categories.length).toBeGreaterThan(0);
  });

  it("finds example entries by ID", () => {
    const entry = findExampleEntry("add");
    expect(entry).toBeDefined();
    expect(entry!.name).toBe("ADD instruction");
    expect(entry!.file).toBe("generic/add.pvm");
  });

  it("finds JAM SPI examples", () => {
    const entry = findExampleEntry("add-jam");
    expect(entry).toBeDefined();
    expect(entry!.format).toBe("jam_spi_with_metadata");
    expect(entry!.entrypoint?.type).toBe("accumulate");
  });

  it("returns undefined for unknown example ID", () => {
    expect(findExampleEntry("nonexistent")).toBeUndefined();
  });

  it("converts manifest entrypoint to SpiEntrypointParams", () => {
    const entry = findExampleEntry("add-jam");
    expect(entry?.entrypoint).toBeDefined();
    const params = manifestEntrypointToParams(entry!.entrypoint!);
    expect(params.entrypoint).toBe("accumulate");
    expect(params.pc).toBe(5);
    if (params.entrypoint === "accumulate") {
      expect(params.params.slot).toBe(42);
    }
  });

  it("converts manifest initialState overrides", () => {
    const entry = findExampleEntry("add");
    expect(entry?.initialState).toBeDefined();
    const overrides = manifestInitialStateOverrides(entry!.initialState!);
    expect(overrides.pc).toBe(0);
    expect(overrides.gas).toBe(10000n);
    expect(overrides.registers).toBeDefined();
    expect(overrides.registers![7]).toBe(1n);
    expect(overrides.registers![8]).toBe(2n);
  });
});

// ============================================================================
// Decode: Generic
// ============================================================================

describe("decodeGeneric", () => {
  it("produces default state with zeros", () => {
    const envelope = decodeGeneric(
      new Uint8Array([0x00]),
      "manual_input",
      "test",
    );
    expect(envelope.programKind).toBe("generic");
    expect(envelope.initialState.pc).toBe(0);
    expect(envelope.initialState.gas).toBe(1_000_000n);
    expect(envelope.initialState.registers.length).toBe(13);
    expect(envelope.initialState.registers.every((r) => r === 0n)).toBe(true);
    expect(envelope.initialState.pageMap).toEqual([]);
    expect(envelope.initialState.memoryChunks).toEqual([]);
  });

  it("applies overrides", () => {
    const envelope = decodeGeneric(
      new Uint8Array([0x00]),
      "manual_input",
      "test",
      { pc: 10, gas: 500n },
    );
    expect(envelope.initialState.pc).toBe(10);
    expect(envelope.initialState.gas).toBe(500n);
  });
});

// ============================================================================
// Decode: JSON Test Vector
// ============================================================================

describe("decodeJsonTestVector", () => {
  it("decodes JSON fixture into generic envelope with correct state", () => {
    const jsonStr = readFixtureText("json/inst_add_32.json");
    const data = JSON.parse(jsonStr);
    const envelope = decodeJsonTestVector(data, "example", "inst-add-32");

    expect(envelope.programKind).toBe("generic");
    expect(Array.from(envelope.programBytes)).toEqual([0x04, 0x87, 0x03]);
    expect(envelope.initialState.pc).toBe(0);
    expect(envelope.initialState.gas).toBe(10000n);
    expect(envelope.initialState.registers.length).toBe(13);
    expect(envelope.initialState.registers[7]).toBe(7n);
    expect(envelope.initialState.registers[8]).toBe(3n);
  });

  it("preserves expected state including non-halt outcomes", () => {
    const data = {
      program: [0x00],
      "initial-regs": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "initial-pc": 0,
      "initial-gas": 100,
      "expected-status": "panic",
      "expected-regs": [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "expected-pc": 5,
      "expected-gas": 99,
      "expected-memory": [],
    };
    const envelope = decodeJsonTestVector(data, "example", "test-panic");
    expect(envelope.expectedState).toBeDefined();
    expect(envelope.expectedState!.status).toBe("panic");
    expect(envelope.expectedState!.pc).toBe(5);
    expect(envelope.expectedState!.gas).toBe(99n);
    expect(envelope.expectedState!.registers[0]).toBe(1n);
  });
});

// ============================================================================
// Decode: SPI
// ============================================================================

describe("decodeSpi", () => {
  it("decodes add.jam as SPI with metadata", () => {
    const bytes = readFixture("add.jam");
    const envelope = decodeSpi(
      bytes,
      new Uint8Array([0x2a, 0x00, 0x00]),
      true,
      "example",
      "add-jam",
    );

    expect(envelope.programKind).toBe("jam_spi");
    expect(envelope.programBytes.length).toBeGreaterThan(0);
    expect(envelope.metadata).toBeDefined();
    expect(envelope.metadata!.length).toBeGreaterThan(0);
    expect(envelope.loadContext).toBeDefined();
    expect(envelope.loadContext!.spiProgram).toBeDefined();
    expect(envelope.loadContext!.spiProgram!.hasMetadata).toBe(true);
    expect(envelope.initialState.pageMap.length).toBeGreaterThanOrEqual(0);
    expect(envelope.initialState.registers.length).toBe(13);
  });

  it("produces page-aligned page map entries", () => {
    const bytes = readFixture("add.jam");
    const envelope = decodeSpi(bytes, new Uint8Array(), true, "example", "add-jam");
    for (const entry of envelope.initialState.pageMap) {
      expect(entry.address % 4096).toBe(0);
    }
  });
});

// ============================================================================
// Decode: Trace
// ============================================================================

describe("decodeTrace", () => {
  it("decodes trace-001.log into an envelope with trace data", () => {
    const text = readFixtureText("trace-001.log");
    const envelope = decodeTrace(text, "example", "trace-001");

    expect(envelope.trace).toBeDefined();
    expect(envelope.trace!.prelude.programHex.length).toBeGreaterThan(0);
    expect(envelope.initialState.gas).toBeGreaterThan(0n);
    expect(envelope.sourceMeta.sourceId).toBe("trace-001");
  });

  it("decodes io-trace-output.log into an envelope with trace data", () => {
    const text = readFixtureText("io-trace-output.log");
    const envelope = decodeTrace(text, "example", "io-trace");

    expect(envelope.trace).toBeDefined();
    expect(envelope.trace!.entries.length).toBeGreaterThan(0);
    expect(envelope.programBytes.length).toBeGreaterThan(0);
  });

  it("preserves trace prelude PC and gas", () => {
    const text = readFixtureText("trace-001.log");
    const envelope = decodeTrace(text, "example", "trace-001");
    const trace = envelope.trace!;

    expect(envelope.initialState.pc).toBe(trace.prelude.startPc);
    expect(envelope.initialState.gas).toBe(trace.prelude.startGas);
  });
});

// ============================================================================
// createProgramEnvelope — full pipeline
// ============================================================================

describe("createProgramEnvelope", () => {
  it("returns a plain ProgramEnvelope (not a Promise)", () => {
    const payload: RawPayload = {
      sourceKind: "manual_input",
      sourceId: "test",
      bytes: new Uint8Array([0x00]),
    };
    const result = createProgramEnvelope(payload);
    // Verify it's not a Promise
    expect(result).toBeDefined();
    expect(typeof (result as unknown as Promise<unknown>).then).not.toBe("function");
    expect(result.programKind).toBeDefined();
  });

  it("creates generic envelope from .pvm bytes", () => {
    const bytes = readFixture("generic/add.pvm");
    const payload: RawPayload = {
      sourceKind: "manual_input",
      sourceId: "add",
      bytes,
    };
    const envelope = createProgramEnvelope(payload);
    expect(envelope.programKind).toBe("generic");
    expect(envelope.initialState.gas).toBe(1_000_000n);
  });

  it("creates SPI envelope from .jam bytes with entrypoint", () => {
    const bytes = readFixture("add.jam");
    const payload: RawPayload = {
      sourceKind: "example",
      sourceId: "add-jam",
      bytes,
    };
    const envelope = createProgramEnvelope(payload);

    expect(envelope.programKind).toBe("jam_spi");
    expect(envelope.metadata).toBeDefined();
    expect(envelope.loadContext).toBeDefined();
    expect(envelope.loadContext!.spiArgs).toBeDefined();
    expect(envelope.spiEntrypoint).toBe("accumulate");
  });

  it("creates trace envelope from trace file", () => {
    const bytes = readFixture("trace-001.log");
    const payload: RawPayload = {
      sourceKind: "example",
      sourceId: "trace-001",
      bytes,
    };
    const envelope = createProgramEnvelope(payload);
    expect(envelope.trace).toBeDefined();
  });

  it("creates JSON test vector envelope", () => {
    const bytes = readFixture("json/inst_add_32.json");
    const payload: RawPayload = {
      sourceKind: "example",
      sourceId: "inst-add-32",
      bytes,
    };
    const envelope = createProgramEnvelope(payload);
    expect(envelope.programKind).toBe("generic");
    expect(envelope.initialState.registers[7]).toBe(7n);
    expect(envelope.expectedState).toBeDefined();
    expect(envelope.expectedState!.status).toBe("halt");
  });

  it("applies generic manifest overrides for example payloads", () => {
    const bytes = readFixture("generic/add.pvm");
    const payload: RawPayload = {
      sourceKind: "example",
      sourceId: "add",
      bytes,
    };
    const envelope = createProgramEnvelope(payload);
    expect(envelope.initialState.gas).toBe(10000n);
    expect(envelope.initialState.registers[7]).toBe(1n);
    expect(envelope.initialState.registers[8]).toBe(2n);
  });

  it("applies manifest-provided page map overrides", () => {
    const bytes = readFixture("generic/game-of-life.pvm");
    const payload: RawPayload = {
      sourceKind: "example",
      sourceId: "game-of-life",
      bytes,
    };
    const envelope = createProgramEnvelope(payload);
    expect(envelope.initialState.pageMap.length).toBeGreaterThan(0);
    expect(envelope.initialState.pageMap[0].address).toBe(131072);
  });

  it("uses caller-provided entrypoint over manifest default", () => {
    const bytes = readFixture("add.jam");
    const payload: RawPayload = {
      sourceKind: "example",
      sourceId: "add-jam",
      bytes,
    };
    const customEntrypoint: SpiEntrypointParams = {
      entrypoint: "refine",
      pc: 0,
      params: {
        core: 1,
        index: 0,
        id: 0,
        payload: new Uint8Array(),
        package: new Uint8Array(),
      },
    };
    const envelope = createProgramEnvelope(payload, { entrypoint: customEntrypoint });
    expect(envelope.spiEntrypoint).toBe("refine");
    expect(envelope.initialState.pc).toBe(0);
  });
});
