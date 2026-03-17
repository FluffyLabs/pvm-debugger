import { describe, it, expect } from "vitest";
import type { TraceEntry, TraceTermination, EcalliTrace } from "@pvmdbg/types";
import {
  traceToRows,
  mismatchedEntryIndices,
  formatEntryLines,
  formatTerminationLines,
  decodeLogMessage,
} from "./trace-display";

function makeEntry(overrides: Partial<TraceEntry> = {}): TraceEntry {
  return {
    index: 0,
    pc: 0,
    gas: 1000n,
    registers: new Map(),
    memoryReads: [],
    memoryWrites: [],
    registerWrites: new Map(),
    ...overrides,
  };
}

function makeTrace(entries: TraceEntry[] = [], termination?: TraceTermination): EcalliTrace {
  return {
    prelude: {
      programHex: "0x00",
      memoryWrites: [],
      startPc: 0,
      startGas: 1000000n,
      startRegisters: new Map(),
    },
    entries,
    termination,
  };
}

describe("traceToRows", () => {
  it("returns empty array for trace with no entries and no termination", () => {
    const trace = makeTrace();
    expect(traceToRows(trace)).toEqual([]);
  });

  it("maps entries to entry rows with correct indices", () => {
    const entries = [makeEntry({ index: 3 }), makeEntry({ index: 100 })];
    const rows = traceToRows(makeTrace(entries));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ kind: "entry", entry: entries[0], index: 0 });
    expect(rows[1]).toEqual({ kind: "entry", entry: entries[1], index: 1 });
  });

  it("appends termination row at the end", () => {
    const term: TraceTermination = { kind: "halt", pc: 10, gas: 500n, registers: new Map() };
    const rows = traceToRows(makeTrace([makeEntry()], term));
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual({ kind: "termination", termination: term });
  });

  it("returns only termination row when no entries exist", () => {
    const term: TraceTermination = { kind: "panic", arg: 1, pc: 5, gas: 0n, registers: new Map() };
    const rows = traceToRows(makeTrace([], term));
    expect(rows).toHaveLength(1);
    expect(rows[0].kind).toBe("termination");
  });
});

describe("formatEntryLines", () => {
  it("formats header line with ecalli index and gas", () => {
    const entry = makeEntry({ index: 2, gas: 999n });
    const lines = formatEntryLines(entry);
    expect(lines[0]).toBe("ecalli 2, ω7 = 999");
  });

  it("formats memory reads", () => {
    const entry = makeEntry({
      memoryReads: [{ address: 0x100, length: 4, dataHex: "deadbeef" }],
    });
    const lines = formatEntryLines(entry);
    expect(lines).toContainEqual("  mem read [0x100] len=4 deadbeef");
  });

  it("formats memory writes", () => {
    const entry = makeEntry({
      memoryWrites: [{ address: 0x200, dataHex: "cafe" }],
    });
    const lines = formatEntryLines(entry);
    expect(lines).toContainEqual("  mem write [0x200] cafe");
  });

  it("formats register writes", () => {
    const entry = makeEntry({
      registerWrites: new Map([[7, 42n]]),
    });
    const lines = formatEntryLines(entry);
    expect(lines).toContainEqual("  ω7 ← 42");
  });

  it("formats gas update when gasAfter is present", () => {
    const entry = makeEntry({ gasAfter: 500n });
    const lines = formatEntryLines(entry);
    expect(lines).toContainEqual("  gas ← 500");
  });

  it("omits gas line when gasAfter is undefined", () => {
    const entry = makeEntry();
    const lines = formatEntryLines(entry);
    expect(lines.some((l) => l.includes("gas ←"))).toBe(false);
  });

  it("includes decoded log message for index 100 with valid UTF-8", () => {
    const entry = makeEntry({
      index: 100,
      memoryReads: [{ address: 0, length: 5, dataHex: "48656c6c6f" }], // "Hello"
    });
    const lines = formatEntryLines(entry);
    expect(lines).toContainEqual('  → "Hello"');
  });

  it("returns only header when entry has no details", () => {
    const entry = makeEntry({ index: 0, gas: 100n });
    const lines = formatEntryLines(entry);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe("ecalli 0, ω7 = 100");
  });
});

describe("formatTerminationLines", () => {
  it("formats halt without arg", () => {
    const term: TraceTermination = { kind: "halt", pc: 10, gas: 0n, registers: new Map() };
    const lines = formatTerminationLines(term);
    expect(lines[0]).toBe("halt");
    expect(lines[1]).toBe("  pc = 10, gas = 0");
  });

  it("formats panic with arg", () => {
    const term: TraceTermination = { kind: "panic", arg: 1, pc: 5, gas: 100n, registers: new Map() };
    const lines = formatTerminationLines(term);
    expect(lines[0]).toBe("panic 1");
  });

  it("formats oog", () => {
    const term: TraceTermination = { kind: "oog", pc: 20, gas: 0n, registers: new Map() };
    const lines = formatTerminationLines(term);
    expect(lines[0]).toBe("oog");
  });
});

describe("decodeLogMessage", () => {
  it("returns null when no memory reads", () => {
    const entry = makeEntry({ index: 100 });
    expect(decodeLogMessage(entry)).toBeNull();
  });

  it("decodes valid UTF-8 from the longest memory read", () => {
    const entry = makeEntry({
      index: 100,
      memoryReads: [
        { address: 0, length: 2, dataHex: "0102" },        // short, not the message
        { address: 10, length: 5, dataHex: "776f726c64" },  // "world" — longest
      ],
    });
    expect(decodeLogMessage(entry)).toBe("world");
  });

  it("falls back to hex for invalid UTF-8", () => {
    const entry = makeEntry({
      index: 100,
      memoryReads: [{ address: 0, length: 2, dataHex: "ff80" }],
    });
    const result = decodeLogMessage(entry);
    expect(result).toContain("ff80");
  });

  it("handles 0x-prefixed hex in memory reads", () => {
    const entry = makeEntry({
      index: 100,
      memoryReads: [{ address: 0, length: 2, dataHex: "0x4869" }], // "Hi"
    });
    expect(decodeLogMessage(entry)).toBe("Hi");
  });
});

describe("mismatchedEntryIndices", () => {
  it("returns empty set when traces match", () => {
    const entry = makeEntry({ index: 0 });
    const trace = makeTrace([entry]);
    const indices = mismatchedEntryIndices(trace, trace);
    expect(indices.size).toBe(0);
  });

  it("detects mismatched entries by index", () => {
    const a = makeTrace([makeEntry({ index: 0, gas: 100n })]);
    const b = makeTrace([makeEntry({ index: 0, gas: 200n })]);
    const indices = mismatchedEntryIndices(a, b);
    expect(indices.has(0)).toBe(true);
  });

  it("detects mismatched entries when entry counts differ", () => {
    const a = makeTrace([makeEntry(), makeEntry()]);
    const b = makeTrace([makeEntry()]);
    const indices = mismatchedEntryIndices(a, b);
    // Entry 1 is missing in b, so it should be marked
    expect(indices.has(1)).toBe(true);
  });

  it("returns empty set when both traces are empty", () => {
    const a = makeTrace([]);
    const b = makeTrace([]);
    expect(mismatchedEntryIndices(a, b).size).toBe(0);
  });
});
