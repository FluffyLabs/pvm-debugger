import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  detectFormat,
  canDecodeSpi,
  createProgramEnvelope,
  encodeSpiEntrypoint,
  decodeSpiEntrypoint,
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
import { decodeVarU32 } from "@pvmdbg/types";

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
    // Construct a synthetic blob: [0x80, 0x91] + 145 bytes of fake metadata + real SPI payload
    // [0x80, 0x91] decodes as (0x80 & 0x3f) << 8 | 0x91 = 0 << 8 | 0x91 = 145
    const addJam = readFixture("add.jam");
    // Strip the original 1-byte varU32 metadata from add.jam to get the raw SPI
    const { value: origMetaLen, bytesRead } = decodeVarU32(addJam, 0);
    const rawSpi = addJam.subarray(bytesRead + origMetaLen);

    // Build new blob: 2-byte varU32(145) + 145 bytes of metadata + raw SPI
    const fakeMetadata = new Uint8Array(145).fill(0x41); // 'A' repeated
    const newBlob = new Uint8Array(2 + 145 + rawSpi.length);
    newBlob[0] = 0x80; // 2-byte varU32 lead
    newBlob[1] = 0x91; // = 145
    newBlob.set(fakeMetadata, 2);
    newBlob.set(rawSpi, 2 + 145);

    const result = detectFormat(newBlob);
    expect(result.kind).toBe("jam_spi_with_metadata");
    if (result.kind === "jam_spi_with_metadata") {
      expect(result.metadata.length).toBe(145);
      expect(result.spiPayload.length).toBe(rawSpi.length);
    }
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

  it("validates with actual decode, not just prefix heuristics", () => {
    // A blob that starts with valid varU32 prefix but isn't actually SPI
    const fake = new Uint8Array([0x05, 0x00, 0x00, 0x00, 0x00, 0x42, 0x42, 0x42]);
    expect(canDecodeSpi(fake, true)).toBe(false);
    expect(canDecodeSpi(fake, false)).toBe(false);
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

  it("encodes refine with workPackageHash as fixed 32 bytes", () => {
    const hash = new Uint8Array(32);
    hash[0] = 0xbb;
    hash[1] = 0xcc;
    const params: SpiEntrypointParams = {
      entrypoint: "refine",
      pc: 0,
      params: {
        core: 1,
        index: 2,
        id: 3,
        payload: new Uint8Array([0xaa]),
        workPackageHash: hash,
      },
    };
    const result = encodeSpiEntrypoint(params);
    // core(1), index(2), id(3), blob(len=1, 0xaa), then 32 bytes of hash
    expect(result.length).toBe(3 + 2 + 32); // 3 varU32s + blob(1+1) + 32
    expect(result[0]).toBe(0x01); // core
    expect(result[1]).toBe(0x02); // index
    expect(result[2]).toBe(0x03); // id
    expect(result[3]).toBe(0x01); // payload length
    expect(result[4]).toBe(0xaa); // payload data
    expect(result[5]).toBe(0xbb); // hash byte 0
    expect(result[6]).toBe(0xcc); // hash byte 1
    expect(result.length).toBe(37);
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

  it("encodes refine with empty payload and zero hash", () => {
    const params: SpiEntrypointParams = {
      entrypoint: "refine",
      pc: 0,
      params: {
        core: 0,
        index: 0,
        id: 0,
        payload: new Uint8Array(),
        workPackageHash: new Uint8Array(32),
      },
    };
    const result = encodeSpiEntrypoint(params);
    // core(0), index(0), id(0), blob(len=0), 32 zero bytes
    expect(result.length).toBe(3 + 1 + 32); // 3 varU32s + empty blob + 32 bytes hash
    expect(result[0]).toBe(0x00);
    expect(result[3]).toBe(0x00); // empty payload
    // remaining 32 bytes are all zero
    for (let i = 4; i < 36; i++) {
      expect(result[i]).toBe(0x00);
    }
  });

  it("encodes accumulate with 2-byte varU32 slot value (slot=200)", () => {
    const params: SpiEntrypointParams = {
      entrypoint: "accumulate",
      pc: 5,
      params: { slot: 200, id: 0, results: 0 },
    };
    const result = encodeSpiEntrypoint(params);
    // 200 = 0xC8, which fits in 2-byte varU32: [0x80 | (200 >> 8), 200 & 0xff] = [0x80, 0xc8]
    expect(Array.from(result)).toEqual([0x80, 0xc8, 0x00, 0x00]);
  });
});

// ============================================================================
// SPI Entrypoint Decoding & Roundtrip
// ============================================================================

describe("decodeSpiEntrypoint", () => {
  it("decodes accumulate bytes back to params", () => {
    const bytes = new Uint8Array([0x2a, 0x00, 0x00]);
    const result = decodeSpiEntrypoint("accumulate", bytes);
    expect(result.entrypoint).toBe("accumulate");
    expect(result.pc).toBe(5);
    if (result.entrypoint === "accumulate") {
      expect(result.params.slot).toBe(42);
      expect(result.params.id).toBe(0);
      expect(result.params.results).toBe(0);
    }
  });

  it("decodes refine bytes back to params with fixed 32-byte hash", () => {
    // Build: core=1, index=2, id=3, payload=[0xaa], then 32-byte hash
    const hash = new Uint8Array(32);
    hash[0] = 0xbb;
    hash[1] = 0xcc;
    const bytes = new Uint8Array([0x01, 0x02, 0x03, 0x01, 0xaa, ...hash]);
    const result = decodeSpiEntrypoint("refine", bytes);
    expect(result.entrypoint).toBe("refine");
    expect(result.pc).toBe(0);
    if (result.entrypoint === "refine") {
      expect(result.params.core).toBe(1);
      expect(result.params.index).toBe(2);
      expect(result.params.id).toBe(3);
      expect(Array.from(result.params.payload)).toEqual([0xaa]);
      expect(result.params.workPackageHash.length).toBe(32);
      expect(result.params.workPackageHash[0]).toBe(0xbb);
      expect(result.params.workPackageHash[1]).toBe(0xcc);
    }
  });

  it("decodes is_authorized bytes back to params", () => {
    const bytes = new Uint8Array([0x05]);
    const result = decodeSpiEntrypoint("is_authorized", bytes);
    expect(result.entrypoint).toBe("is_authorized");
    expect(result.pc).toBe(0);
    if (result.entrypoint === "is_authorized") {
      expect(result.params.core).toBe(5);
    }
  });

  it("throws on truncated accumulate bytes", () => {
    expect(() => decodeSpiEntrypoint("accumulate", new Uint8Array([0x2a]))).toThrow();
  });

  it("throws on empty bytes for refine", () => {
    expect(() => decodeSpiEntrypoint("refine", new Uint8Array())).toThrow();
  });
});

describe("SPI entrypoint encode/decode roundtrip", () => {
  it("roundtrips accumulate params", () => {
    const params: SpiEntrypointParams = {
      entrypoint: "accumulate",
      pc: 5,
      params: { slot: 42, id: 7, results: 3 },
    };
    const encoded = encodeSpiEntrypoint(params);
    const decoded = decodeSpiEntrypoint("accumulate", encoded);
    expect(decoded).toEqual(params);
  });

  it("roundtrips refine params with payload and hash", () => {
    const hash = new Uint8Array(32);
    hash[0] = 0xca;
    hash[1] = 0xfe;
    const params: SpiEntrypointParams = {
      entrypoint: "refine",
      pc: 0,
      params: {
        core: 10,
        index: 20,
        id: 30,
        payload: new Uint8Array([0xde, 0xad, 0xbe, 0xef]),
        workPackageHash: hash,
      },
    };
    const encoded = encodeSpiEntrypoint(params);
    const decoded = decodeSpiEntrypoint("refine", encoded);
    expect(decoded.entrypoint).toBe("refine");
    if (decoded.entrypoint === "refine") {
      expect(decoded.params.core).toBe(10);
      expect(decoded.params.index).toBe(20);
      expect(decoded.params.id).toBe(30);
      expect(Array.from(decoded.params.payload)).toEqual([0xde, 0xad, 0xbe, 0xef]);
      expect(decoded.params.workPackageHash.length).toBe(32);
      expect(decoded.params.workPackageHash[0]).toBe(0xca);
      expect(decoded.params.workPackageHash[1]).toBe(0xfe);
    }
  });

  it("roundtrips refine with empty payload and zero hash", () => {
    const params: SpiEntrypointParams = {
      entrypoint: "refine",
      pc: 0,
      params: {
        core: 0,
        index: 0,
        id: 0,
        payload: new Uint8Array(),
        workPackageHash: new Uint8Array(32),
      },
    };
    const encoded = encodeSpiEntrypoint(params);
    const decoded = decodeSpiEntrypoint("refine", encoded);
    expect(decoded.entrypoint).toBe("refine");
    if (decoded.entrypoint === "refine") {
      expect(decoded.params.core).toBe(0);
      expect(decoded.params.payload.length).toBe(0);
      expect(decoded.params.workPackageHash.length).toBe(32);
    }
  });

  it("roundtrips is_authorized params", () => {
    const params: SpiEntrypointParams = {
      entrypoint: "is_authorized",
      pc: 0,
      params: { core: 99 },
    };
    const encoded = encodeSpiEntrypoint(params);
    const decoded = decodeSpiEntrypoint("is_authorized", encoded);
    expect(decoded).toEqual(params);
  });

  it("roundtrips accumulate with large 2-byte varU32 values", () => {
    const params: SpiEntrypointParams = {
      entrypoint: "accumulate",
      pc: 5,
      params: { slot: 200, id: 500, results: 1000 },
    };
    const encoded = encodeSpiEntrypoint(params);
    const decoded = decodeSpiEntrypoint("accumulate", encoded);
    expect(decoded).toEqual(params);
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

  it("wraps raw instruction bytes in a PVM blob", () => {
    const rawCode = new Uint8Array([0x04, 0x87, 0x03]);
    const envelope = decodeGeneric(rawCode, "manual_input", "test");
    // PVM blob: [jtLen=0, jtItemLen=0, codeLen=3, code..., mask=0x01]
    expect(Array.from(envelope.programBytes)).toEqual([0x00, 0x00, 0x03, 0x04, 0x87, 0x03, 0x01]);
  });

  it("wraps empty program in a valid PVM blob", () => {
    const envelope = decodeGeneric(new Uint8Array(), "manual_input", "test");
    // PVM blob: [jtLen=0, jtItemLen=0, codeLen=0] — no code, no mask
    expect(Array.from(envelope.programBytes)).toEqual([0x00, 0x00, 0x00]);
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
    // The fixture contains pre-encoded PVM blob bytes [0, 0, 3, 190, 135, 9, 1]
    // (upstream jamtestvectors format). deblob succeeds so they're used as-is.
    expect(Array.from(envelope.programBytes)).toEqual([0x00, 0x00, 0x03, 190, 135, 9, 0x01]);
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
        workPackageHash: new Uint8Array(32),
      },
    };
    const envelope = createProgramEnvelope(payload, { entrypoint: customEntrypoint });
    expect(envelope.spiEntrypoint).toBe("refine");
    expect(envelope.initialState.pc).toBe(0);
  });
});
