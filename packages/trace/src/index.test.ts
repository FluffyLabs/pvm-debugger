import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { EcalliTrace, TraceEntry } from "./index.js";
import {
  compareTraces,
  getHostCallName,
  HOST_CALL_NAMES,
  parseTrace,
  serializeTrace,
  traceMemoryWriteToBytes,
} from "./index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = resolve(__dirname, "../../../fixtures");

function readFixture(name: string): string {
  return readFileSync(resolve(fixturesDir, name), "utf-8");
}

// ===== HOST_CALL_NAMES =====

describe("HOST_CALL_NAMES — GP 0.7.2", () => {
  it("maps general host calls (0-5)", () => {
    expect(HOST_CALL_NAMES[0]).toBe("gas");
    expect(HOST_CALL_NAMES[1]).toBe("fetch");
    expect(HOST_CALL_NAMES[2]).toBe("lookup");
    expect(HOST_CALL_NAMES[3]).toBe("read");
    expect(HOST_CALL_NAMES[4]).toBe("write");
    expect(HOST_CALL_NAMES[5]).toBe("info");
  });

  it("maps refine host calls (6-13)", () => {
    expect(HOST_CALL_NAMES[6]).toBe("historical_lookup");
    expect(HOST_CALL_NAMES[7]).toBe("export");
    expect(HOST_CALL_NAMES[8]).toBe("machine");
    expect(HOST_CALL_NAMES[9]).toBe("peek");
    expect(HOST_CALL_NAMES[10]).toBe("poke");
    expect(HOST_CALL_NAMES[11]).toBe("pages");
    expect(HOST_CALL_NAMES[12]).toBe("invoke");
    expect(HOST_CALL_NAMES[13]).toBe("expunge");
  });

  it("maps accumulate host calls (14-26)", () => {
    expect(HOST_CALL_NAMES[14]).toBe("bless");
    expect(HOST_CALL_NAMES[15]).toBe("assign");
    expect(HOST_CALL_NAMES[16]).toBe("designate");
    expect(HOST_CALL_NAMES[17]).toBe("checkpoint");
    expect(HOST_CALL_NAMES[18]).toBe("new_service");
    expect(HOST_CALL_NAMES[19]).toBe("upgrade");
    expect(HOST_CALL_NAMES[20]).toBe("transfer");
    expect(HOST_CALL_NAMES[21]).toBe("eject");
    expect(HOST_CALL_NAMES[22]).toBe("query");
    expect(HOST_CALL_NAMES[23]).toBe("solicit");
    expect(HOST_CALL_NAMES[24]).toBe("forget");
    expect(HOST_CALL_NAMES[25]).toBe("yield_result");
    expect(HOST_CALL_NAMES[26]).toBe("provide");
  });

  it("maps JIP host call (100)", () => {
    expect(HOST_CALL_NAMES[100]).toBe("log");
  });
});

describe("getHostCallName", () => {
  it("returns name for known indices", () => {
    expect(getHostCallName(0)).toBe("gas");
    expect(getHostCallName(100)).toBe("log");
    expect(getHostCallName(4)).toBe("write");
    expect(getHostCallName(14)).toBe("bless");
  });

  it("returns deterministic fallback for unknown indices", () => {
    expect(getHostCallName(999)).toBe("unknown(999)");
    expect(getHostCallName(99)).toBe("unknown(99)");
    expect(getHostCallName(-1)).toBe("unknown(-1)");
  });
});

// ===== PARSER — fixture: trace-001.log =====

describe("parseTrace — trace-001.log", () => {
  let trace: EcalliTrace;

  it("parses successfully", () => {
    const text = readFixture("trace-001.log");
    trace = parseTrace(text);
    expect(trace).toBeDefined();
  });

  it("has a prelude with programHex", () => {
    const text = readFixture("trace-001.log");
    trace = parseTrace(text);
    expect(trace.prelude.programHex.length).toBeGreaterThan(0);
  });

  it("has prelude memoryWrites", () => {
    const text = readFixture("trace-001.log");
    trace = parseTrace(text);
    expect(trace.prelude.memoryWrites.length).toBe(1);
    expect(trace.prelude.memoryWrites[0].address).toBe(0xfeff0000);
    expect(trace.prelude.memoryWrites[0].dataHex).toBe("060003");
  });

  it("has correct start values", () => {
    const text = readFixture("trace-001.log");
    trace = parseTrace(text);
    expect(trace.prelude.startPc).toBe(5);
    expect(trace.prelude.startGas).toBe(20000000n);
    expect(trace.prelude.startRegisters.get(0)).toBe(0xffff0000n);
    expect(trace.prelude.startRegisters.get(1)).toBe(0xfefe0000n);
    expect(trace.prelude.startRegisters.get(7)).toBe(0xfeff0000n);
    expect(trace.prelude.startRegisters.get(8)).toBe(3n);
  });

  it("has 66 host call entries", () => {
    const text = readFixture("trace-001.log");
    trace = parseTrace(text);
    expect(trace.entries.length).toBe(66);
  });

  it("first entry is ecalli=1", () => {
    const text = readFixture("trace-001.log");
    trace = parseTrace(text);
    expect(trace.entries[0].index).toBe(1);
    expect(trace.entries[0].pc).toBe(93537);
    expect(trace.entries[0].gas).toBe(19999962n);
  });

  it("first entry has register writes and gasAfter", () => {
    const text = readFixture("trace-001.log");
    trace = parseTrace(text);
    expect(trace.entries[0].registerWrites.get(7)).toBe(0x86n);
    expect(trace.entries[0].gasAfter).toBe(19999952n);
  });

  it("terminates with HALT", () => {
    const text = readFixture("trace-001.log");
    trace = parseTrace(text);
    expect(trace.termination).toBeDefined();
    expect(trace.termination!.kind).toBe("halt");
    expect(trace.termination!.pc).toBe(82601);
    expect(trace.termination!.gas).toBe(19521320n);
  });
});

// ===== PARSER — fixture: io-trace-output.log (wrapped) =====

describe("parseTrace — io-trace-output.log", () => {
  it("parses successfully (wrapped format)", () => {
    const text = readFixture("io-trace-output.log");
    const trace = parseTrace(text);
    expect(trace).toBeDefined();
    expect(trace.prelude.programHex.length).toBeGreaterThan(0);
  });

  it("has correct start values", () => {
    const text = readFixture("io-trace-output.log");
    const trace = parseTrace(text);
    expect(trace.prelude.startPc).toBe(5);
    expect(trace.prelude.startGas).toBe(100000n);
  });

  it("has entries", () => {
    const text = readFixture("io-trace-output.log");
    const trace = parseTrace(text);
    expect(trace.entries.length).toBeGreaterThan(0);
  });

  it("terminates with HALT", () => {
    const text = readFixture("io-trace-output.log");
    const trace = parseTrace(text);
    expect(trace.termination).toBeDefined();
    expect(trace.termination!.kind).toBe("halt");
  });
});

// ===== PARSER — error cases =====

describe("parseTrace — validation", () => {
  it("throws when program is missing", () => {
    expect(() => parseTrace("start pc=0 gas=100\nHALT pc=0 gas=100")).toThrow(
      /missing mandatory 'program'/,
    );
  });

  it("throws when start is missing", () => {
    expect(() => parseTrace("program 0xaabb\nHALT pc=0 gas=100")).toThrow(
      /missing mandatory 'start'/,
    );
  });

  it("throws when len= does not match hex data length", () => {
    const input = [
      "program 0xaabb",
      "memwrite 0x00001000 len=5 <- 0xaabb",
      "start pc=0 gas=100",
    ].join("\n");
    expect(() => parseTrace(input)).toThrow(
      /len=5 does not match hex data length 2/,
    );
  });

  it("throws on memread outside of ecalli entry", () => {
    const input = [
      "program 0xaabb",
      "start pc=0 gas=100",
      "memread 0x00001000 len=2 -> 0xaabb",
    ].join("\n");
    expect(() => parseTrace(input)).toThrow(
      /memread outside of a host call entry/,
    );
  });

  it("throws on setreg outside of ecalli entry", () => {
    const input = [
      "program 0xaabb",
      "start pc=0 gas=100",
      "setreg r07 <- 0xff",
    ].join("\n");
    expect(() => parseTrace(input)).toThrow(
      /setreg outside of a host call entry/,
    );
  });

  it("throws on setgas outside of ecalli entry", () => {
    const input = ["program 0xaabb", "start pc=0 gas=100", "setgas <- 50"].join(
      "\n",
    );
    expect(() => parseTrace(input)).toThrow(
      /setgas outside of a host call entry/,
    );
  });
});

// ===== PARSER — FAULT termination =====

describe("parseTrace — FAULT termination", () => {
  it("parses FAULT into kind=fault", () => {
    const input = [
      "program 0xaabb",
      "start pc=0 gas=100",
      "FAULT=42 pc=10 gas=50 r00=0x1",
    ].join("\n");
    const trace = parseTrace(input);
    expect(trace.termination).toBeDefined();
    expect(trace.termination!.kind).toBe("fault");
    expect(trace.termination!.arg).toBe(42);
    expect(trace.termination!.pc).toBe(10);
    expect(trace.termination!.gas).toBe(50n);
    expect(trace.termination!.registers.get(0)).toBe(1n);
  });
});

// ===== PARSER — PANIC termination =====

describe("parseTrace — PANIC termination", () => {
  it("matches PANIC= exactly", () => {
    const input = [
      "program 0xaabb",
      "start pc=0 gas=100",
      "PANIC=7 pc=5 gas=80",
    ].join("\n");
    const trace = parseTrace(input);
    expect(trace.termination!.kind).toBe("panic");
    expect(trace.termination!.arg).toBe(7);
  });
});

// ===== PARSER — OOG termination =====

describe("parseTrace — OOG termination", () => {
  it("parses OOG correctly", () => {
    const input = [
      "program 0xaabb",
      "start pc=0 gas=100",
      "OOG pc=20 gas=0",
    ].join("\n");
    const trace = parseTrace(input);
    expect(trace.termination!.kind).toBe("oog");
    expect(trace.termination!.pc).toBe(20);
    expect(trace.termination!.gas).toBe(0n);
  });
});

// ===== SERIALIZER =====

describe("serializeTrace", () => {
  it("omits zero-valued registers", () => {
    const trace: EcalliTrace = {
      prelude: {
        programHex: "aabb",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map([
          [0, 0n],
          [1, 5n],
        ]),
      },
      entries: [],
      termination: {
        kind: "halt",
        pc: 0,
        gas: 100n,
        registers: new Map([
          [0, 0n],
          [2, 0n],
        ]),
      },
    };
    const text = serializeTrace(trace);
    // start should only have r01=0x5
    expect(text).toContain("start pc=0 gas=100 r01=0x5");
    // HALT should have no register dumps (all zero)
    expect(text).toContain("HALT pc=0 gas=100");
    expect(text).not.toContain("r00=0x0");
    expect(text).not.toContain("r02=0x0");
  });

  it("serializes PANIC with arg", () => {
    const trace: EcalliTrace = {
      prelude: {
        programHex: "ff",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map(),
      },
      entries: [],
      termination: {
        kind: "panic",
        arg: 7,
        pc: 5,
        gas: 80n,
        registers: new Map(),
      },
    };
    const text = serializeTrace(trace);
    expect(text).toContain("PANIC=7 pc=5 gas=80");
  });

  it("serializes FAULT with arg", () => {
    const trace: EcalliTrace = {
      prelude: {
        programHex: "ff",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map(),
      },
      entries: [],
      termination: {
        kind: "fault",
        arg: 42,
        pc: 10,
        gas: 50n,
        registers: new Map(),
      },
    };
    const text = serializeTrace(trace);
    expect(text).toContain("FAULT=42 pc=10 gas=50");
  });

  it("serializes OOG", () => {
    const trace: EcalliTrace = {
      prelude: {
        programHex: "ff",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map(),
      },
      entries: [],
      termination: { kind: "oog", pc: 20, gas: 0n, registers: new Map() },
    };
    const text = serializeTrace(trace);
    expect(text).toContain("OOG pc=20 gas=0");
  });

  it("serializes entry sub-commands", () => {
    const entry: TraceEntry = {
      index: 1,
      pc: 100,
      gas: 5000n,
      registers: new Map([[7, 0x327a0n]]),
      memoryReads: [{ address: 0x1000, length: 2, dataHex: "aabb" }],
      memoryWrites: [{ address: 0x2000, dataHex: "ccdd" }],
      registerWrites: new Map([[7, 0x86n]]),
      gasAfter: 4990n,
    };
    const trace: EcalliTrace = {
      prelude: {
        programHex: "ff",
        memoryWrites: [],
        startPc: 0,
        startGas: 10000n,
        startRegisters: new Map(),
      },
      entries: [entry],
      termination: { kind: "halt", pc: 200, gas: 4000n, registers: new Map() },
    };
    const text = serializeTrace(trace);
    expect(text).toContain("ecalli=1 pc=100 gas=5000 r07=0x327a0");
    expect(text).toContain("memread 0x00001000 len=2 -> 0xaabb");
    expect(text).toContain("memwrite 0x00002000 len=2 <- 0xccdd");
    expect(text).toContain("setreg r07 <- 0x86");
    expect(text).toContain("setgas <- 4990");
  });
});

// ===== SERIALIZER — roundtrip =====

describe("serializeTrace — roundtrip", () => {
  it("roundtrips trace-001.log: parse → serialize → parse matches", () => {
    const text = readFixture("trace-001.log");
    const parsed1 = parseTrace(text);
    const serialized = serializeTrace(parsed1);
    const parsed2 = parseTrace(serialized);

    // Structural equality
    expect(parsed2.prelude.programHex).toBe(parsed1.prelude.programHex);
    expect(parsed2.prelude.startPc).toBe(parsed1.prelude.startPc);
    expect(parsed2.prelude.startGas).toBe(parsed1.prelude.startGas);
    expect(parsed2.entries.length).toBe(parsed1.entries.length);

    for (let i = 0; i < parsed1.entries.length; i++) {
      expect(parsed2.entries[i].index).toBe(parsed1.entries[i].index);
      expect(parsed2.entries[i].pc).toBe(parsed1.entries[i].pc);
      expect(parsed2.entries[i].gas).toBe(parsed1.entries[i].gas);
      expect(parsed2.entries[i].gasAfter).toBe(parsed1.entries[i].gasAfter);
      expect(parsed2.entries[i].memoryReads.length).toBe(
        parsed1.entries[i].memoryReads.length,
      );
      expect(parsed2.entries[i].memoryWrites.length).toBe(
        parsed1.entries[i].memoryWrites.length,
      );
    }

    expect(parsed2.termination?.kind).toBe(parsed1.termination?.kind);
    expect(parsed2.termination?.pc).toBe(parsed1.termination?.pc);
    expect(parsed2.termination?.gas).toBe(parsed1.termination?.gas);
  });

  it("roundtrips io-trace-output.log: parse → serialize → parse matches", () => {
    const text = readFixture("io-trace-output.log");
    const parsed1 = parseTrace(text);
    const serialized = serializeTrace(parsed1);
    const parsed2 = parseTrace(serialized);

    expect(parsed2.prelude.programHex).toBe(parsed1.prelude.programHex);
    expect(parsed2.prelude.startPc).toBe(parsed1.prelude.startPc);
    expect(parsed2.prelude.startGas).toBe(parsed1.prelude.startGas);
    expect(parsed2.entries.length).toBe(parsed1.entries.length);
    expect(parsed2.termination?.kind).toBe(parsed1.termination?.kind);
  });

  it("semantic roundtrip: parse(serialize(parse(input))) deep-equals parse(input)", () => {
    const text = readFixture("trace-001.log");
    const parsed1 = parseTrace(text);
    const serialized = serializeTrace(parsed1);
    const parsed2 = parseTrace(serialized);

    // Use comparator for deep equality
    const mismatches = compareTraces(parsed1, parsed2);
    expect(mismatches).toEqual([]);
  });
});

// ===== COMPARATOR =====

describe("compareTraces", () => {
  it("returns no mismatches for identical traces", () => {
    const text = readFixture("trace-001.log");
    const trace = parseTrace(text);
    const mismatches = compareTraces(trace, trace);
    expect(mismatches).toEqual([]);
  });

  it("reports entry-level mismatches for modified gas values", () => {
    const text = readFixture("trace-001.log");
    const a = parseTrace(text);
    // Deep clone by re-parsing
    const b = parseTrace(serializeTrace(a));
    // Modify gas on entry 0
    b.entries[0] = { ...b.entries[0], gas: 999n };

    const mismatches = compareTraces(a, b);
    expect(mismatches.length).toBeGreaterThan(0);
    const gasMismatch = mismatches.find((m) => m.path === "entries[0].gas");
    expect(gasMismatch).toBeDefined();
  });

  it("reports entry-level mismatches for modified memory reads", () => {
    const text = readFixture("trace-001.log");
    const a = parseTrace(text);
    const b = parseTrace(serializeTrace(a));

    // Find an entry with memory reads — assert it exists (trace-001 has log entries with memreads)
    const entryWithReads = b.entries.findIndex((e) => e.memoryReads.length > 0);
    expect(entryWithReads).toBeGreaterThanOrEqual(0);

    b.entries[entryWithReads].memoryReads[0] = {
      ...b.entries[entryWithReads].memoryReads[0],
      dataHex: "deadbeef",
    };

    const mismatches = compareTraces(a, b);
    expect(mismatches.length).toBeGreaterThan(0);
    const readMismatch = mismatches.find((m) =>
      m.path.startsWith(`entries[${entryWithReads}].memoryReads[0]`),
    );
    expect(readMismatch).toBeDefined();
  });

  it("reports entry-level mismatches for modified memory writes", () => {
    const text = readFixture("trace-001.log");
    const a = parseTrace(text);
    const b = parseTrace(serializeTrace(a));

    // Find an entry with memory writes — assert it exists
    const entryWithWrites = b.entries.findIndex(
      (e) => e.memoryWrites.length > 0,
    );
    expect(entryWithWrites).toBeGreaterThanOrEqual(0);

    b.entries[entryWithWrites].memoryWrites[0] = {
      ...b.entries[entryWithWrites].memoryWrites[0],
      dataHex: "feedface",
    };

    const mismatches = compareTraces(a, b);
    expect(mismatches.length).toBeGreaterThan(0);
  });

  it("reports termination mismatches", () => {
    const a: EcalliTrace = {
      prelude: {
        programHex: "ff",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map(),
      },
      entries: [],
      termination: { kind: "halt", pc: 0, gas: 100n, registers: new Map() },
    };
    const b: EcalliTrace = {
      prelude: {
        programHex: "ff",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map(),
      },
      entries: [],
      termination: {
        kind: "panic",
        arg: 1,
        pc: 0,
        gas: 100n,
        registers: new Map(),
      },
    };
    const mismatches = compareTraces(a, b);
    const kindMismatch = mismatches.find((m) => m.path === "termination.kind");
    expect(kindMismatch).toBeDefined();
    expect(kindMismatch!.expected).toBe("halt");
    expect(kindMismatch!.actual).toBe("panic");
  });

  it("reports when termination is missing in one trace", () => {
    const a: EcalliTrace = {
      prelude: {
        programHex: "ff",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map(),
      },
      entries: [],
      termination: { kind: "halt", pc: 0, gas: 100n, registers: new Map() },
    };
    const b: EcalliTrace = {
      prelude: {
        programHex: "ff",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map(),
      },
      entries: [],
    };
    const mismatches = compareTraces(a, b);
    expect(mismatches.find((m) => m.path === "termination")).toBeDefined();
  });

  it("mismatch paths include field-level detail", () => {
    const a: EcalliTrace = {
      prelude: {
        programHex: "aa",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map(),
      },
      entries: [],
    };
    const b: EcalliTrace = {
      prelude: {
        programHex: "bb",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map(),
      },
      entries: [],
    };
    const mismatches = compareTraces(a, b);
    expect(mismatches[0].path).toBe("prelude.programHex");
  });
});

// ===== SERIALIZER — io-trace-output.log deep comparator roundtrip =====

describe("serializeTrace — io-trace-output.log comparator roundtrip", () => {
  it("semantic roundtrip: parse(serialize(parse(input))) deep-equals parse(input)", () => {
    const text = readFixture("io-trace-output.log");
    const parsed1 = parseTrace(text);
    const serialized = serializeTrace(parsed1);
    const parsed2 = parseTrace(serialized);
    const mismatches = compareTraces(parsed1, parsed2);
    expect(mismatches).toEqual([]);
  });
});

// ===== PARSER — edge cases =====

describe("parseTrace — edge cases", () => {
  it("handles entry with no sub-commands (no setreg/setgas/memread/memwrite)", () => {
    const input = [
      "program 0xaabb",
      "start pc=0 gas=1000",
      "ecalli=0 pc=50 gas=900 r07=0x1",
      "HALT pc=100 gas=800",
    ].join("\n");
    const trace = parseTrace(input);
    expect(trace.entries.length).toBe(1);
    expect(trace.entries[0].index).toBe(0);
    expect(trace.entries[0].registerWrites.size).toBe(0);
    expect(trace.entries[0].gasAfter).toBeUndefined();
    expect(trace.entries[0].memoryReads.length).toBe(0);
    expect(trace.entries[0].memoryWrites.length).toBe(0);
  });

  it("handles single-digit register index in setreg (r7 vs r07)", () => {
    const input = [
      "program 0xaabb",
      "start pc=0 gas=1000",
      "ecalli=0 pc=50 gas=900",
      "setreg r7 <- 0xff",
      "HALT pc=100 gas=800",
    ].join("\n");
    const trace = parseTrace(input);
    expect(trace.entries[0].registerWrites.get(7)).toBe(0xffn);
  });

  it("handles trace with no termination (unterminated execution)", () => {
    const input = [
      "program 0xaabb",
      "start pc=0 gas=1000",
      "ecalli=1 pc=50 gas=900",
      "setreg r07 <- 0x10",
    ].join("\n");
    const trace = parseTrace(input);
    expect(trace.entries.length).toBe(1);
    expect(trace.termination).toBeUndefined();
  });

  it("handles trace with no entries (immediate termination)", () => {
    const input = [
      "program 0xaabb",
      "start pc=0 gas=1000",
      "HALT pc=0 gas=1000",
    ].join("\n");
    const trace = parseTrace(input);
    expect(trace.entries.length).toBe(0);
    expect(trace.termination!.kind).toBe("halt");
  });

  it("handles multiple consecutive ecalli entries", () => {
    const input = [
      "program 0xaabb",
      "start pc=0 gas=1000",
      "ecalli=0 pc=10 gas=900",
      "ecalli=1 pc=20 gas=800",
      "ecalli=100 pc=30 gas=700",
      "HALT pc=40 gas=600",
    ].join("\n");
    const trace = parseTrace(input);
    expect(trace.entries.length).toBe(3);
    expect(trace.entries[0].index).toBe(0);
    expect(trace.entries[1].index).toBe(1);
    expect(trace.entries[2].index).toBe(100);
  });

  it("ignores blank lines and unrecognized lines", () => {
    const input = [
      "some random header text",
      "",
      "program 0xaabb",
      "INFO: loading program...",
      "start pc=0 gas=100",
      "   ",
      "HALT pc=0 gas=100",
      "some footer",
    ].join("\n");
    const trace = parseTrace(input);
    expect(trace.prelude.programHex).toBe("aabb");
    expect(trace.termination!.kind).toBe("halt");
  });
});

// ===== COMPARATOR — entry count mismatch =====

describe("compareTraces — entry count mismatch", () => {
  it("reports when trace B has more entries", () => {
    const a: EcalliTrace = {
      prelude: {
        programHex: "ff",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map(),
      },
      entries: [],
    };
    const b: EcalliTrace = {
      prelude: {
        programHex: "ff",
        memoryWrites: [],
        startPc: 0,
        startGas: 100n,
        startRegisters: new Map(),
      },
      entries: [
        {
          index: 0,
          pc: 10,
          gas: 90n,
          registers: new Map(),
          memoryReads: [],
          memoryWrites: [],
          registerWrites: new Map(),
        },
      ],
    };
    const mismatches = compareTraces(a, b);
    expect(mismatches.find((m) => m.path === "entries.length")).toBeDefined();
    expect(mismatches.find((m) => m.path === "entries[0]")).toBeDefined();
  });
});

// ===== traceMemoryWriteToBytes =====

describe("traceMemoryWriteToBytes", () => {
  it("converts { address, dataHex } into { address, data }", () => {
    const result = traceMemoryWriteToBytes({
      address: 0x1000,
      dataHex: "aabbccdd",
    });
    expect(result.address).toBe(0x1000);
    expect(result.data).toEqual(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]));
  });

  it("handles empty data", () => {
    const result = traceMemoryWriteToBytes({ address: 0, dataHex: "" });
    expect(result.address).toBe(0);
    expect(result.data).toEqual(new Uint8Array([]));
  });
});
