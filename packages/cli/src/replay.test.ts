import { describe, it, expect } from "vitest";
import * as path from "node:path";
import { replay, allSessionsTerminal, compareFinalState } from "./replay.js";
import type { MachineStateSnapshot, PvmLifecycle, EcalliTrace } from "@pvmdbg/types";

const FIXTURES_DIR = path.resolve(import.meta.dirname, "../../../fixtures");

describe("allSessionsTerminal", () => {
  it("returns true when all sessions are terminated", () => {
    const snapshots = new Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>([
      ["pvm1", {
        snapshot: { pc: 0, gas: 0n, status: "halt", registers: Array(13).fill(0n) },
        lifecycle: "terminated",
      }],
      ["pvm2", {
        snapshot: { pc: 0, gas: 0n, status: "panic", registers: Array(13).fill(0n) },
        lifecycle: "terminated",
      }],
    ]);
    expect(allSessionsTerminal(snapshots)).toBe(true);
  });

  it("returns true for failed/timed_out sessions", () => {
    const snapshots = new Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>([
      ["pvm1", {
        snapshot: { pc: 0, gas: 0n, status: "halt", registers: Array(13).fill(0n) },
        lifecycle: "failed",
      }],
      ["pvm2", {
        snapshot: { pc: 0, gas: 0n, status: "halt", registers: Array(13).fill(0n) },
        lifecycle: "timed_out",
      }],
    ]);
    expect(allSessionsTerminal(snapshots)).toBe(true);
  });

  it("returns false when any session is paused", () => {
    const snapshots = new Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>([
      ["pvm1", {
        snapshot: { pc: 0, gas: 0n, status: "halt", registers: Array(13).fill(0n) },
        lifecycle: "terminated",
      }],
      ["pvm2", {
        snapshot: { pc: 0, gas: 0n, status: "ok", registers: Array(13).fill(0n) },
        lifecycle: "paused",
      }],
    ]);
    expect(allSessionsTerminal(snapshots)).toBe(false);
  });

  it("returns false when any session is paused_host_call", () => {
    const snapshots = new Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>([
      ["pvm1", {
        snapshot: { pc: 0, gas: 0n, status: "host", registers: Array(13).fill(0n) },
        lifecycle: "paused_host_call",
      }],
    ]);
    expect(allSessionsTerminal(snapshots)).toBe(false);
  });

  it("returns true for empty snapshot map", () => {
    const snapshots = new Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>();
    expect(allSessionsTerminal(snapshots)).toBe(true);
  });
});

describe("compareFinalState", () => {
  const baseTrace: EcalliTrace = {
    prelude: {
      programHex: "00",
      memoryWrites: [],
      startPc: 0,
      startGas: 1000n,
      startRegisters: new Map(),
    },
    entries: [],
    termination: {
      kind: "halt",
      pc: 42,
      gas: 500n,
      registers: new Map<number, bigint>([
        [0, 1n],
        [7, 99n],
      ]),
    },
  };

  it("returns empty mismatches when state matches exactly", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[0] = 1n;
    regs[7] = 99n;

    const result = compareFinalState(
      {
        snapshot: { pc: 42, gas: 500n, status: "halt", registers: regs },
        lifecycle: "terminated",
      },
      baseTrace,
    );
    expect(result).toEqual([]);
  });

  it("reports lifecycle mismatch for non-terminated PVM", () => {
    const result = compareFinalState(
      {
        snapshot: { pc: 42, gas: 500n, status: "ok", registers: Array(13).fill(0n) },
        lifecycle: "paused",
      },
      baseTrace,
    );
    expect(result).toEqual([
      { field: "lifecycle", expected: "terminated", actual: "paused" },
    ]);
  });

  it("reports status mismatch", () => {
    const result = compareFinalState(
      {
        snapshot: { pc: 42, gas: 500n, status: "panic", registers: Array(13).fill(0n) },
        lifecycle: "terminated",
      },
      baseTrace,
    );
    expect(result.some((m) => m.field === "status")).toBe(true);
  });

  it("reports PC mismatch", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[0] = 1n;
    regs[7] = 99n;

    const result = compareFinalState(
      {
        snapshot: { pc: 100, gas: 500n, status: "halt", registers: regs },
        lifecycle: "terminated",
      },
      baseTrace,
    );
    expect(result).toEqual([
      { field: "pc", expected: "42", actual: "100" },
    ]);
  });

  it("reports gas mismatch", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[0] = 1n;
    regs[7] = 99n;

    const result = compareFinalState(
      {
        snapshot: { pc: 42, gas: 999n, status: "halt", registers: regs },
        lifecycle: "terminated",
      },
      baseTrace,
    );
    expect(result).toEqual([
      { field: "gas", expected: "500", actual: "999" },
    ]);
  });

  it("reports register mismatches", () => {
    const result = compareFinalState(
      {
        snapshot: { pc: 42, gas: 500n, status: "halt", registers: Array(13).fill(0n) },
        lifecycle: "terminated",
      },
      baseTrace,
    );
    // r0 expected=1 actual=0, r7 expected=99 actual=0
    const regMismatches = result.filter((m) => m.field.startsWith("register"));
    expect(regMismatches.length).toBe(2);
    expect(regMismatches.find((m) => m.field === "register[0]")).toEqual({
      field: "register[0]",
      expected: "1",
      actual: "0",
    });
    expect(regMismatches.find((m) => m.field === "register[7]")).toEqual({
      field: "register[7]",
      expected: "99",
      actual: "0",
    });
  });

  it("treats missing trace termination registers as expected 0n", () => {
    const trace: EcalliTrace = {
      ...baseTrace,
      termination: {
        kind: "halt",
        pc: 0,
        gas: 0n,
        registers: new Map(), // all expected to be 0
      },
    };

    const result = compareFinalState(
      {
        snapshot: { pc: 0, gas: 0n, status: "halt", registers: Array(13).fill(0n) },
        lifecycle: "terminated",
      },
      trace,
    );
    expect(result).toEqual([]);
  });

  it("handles oog termination kind", () => {
    const trace: EcalliTrace = {
      ...baseTrace,
      termination: {
        kind: "oog",
        pc: 10,
        gas: 0n,
        registers: new Map(),
      },
    };

    const result = compareFinalState(
      {
        snapshot: { pc: 10, gas: 0n, status: "out_of_gas", registers: Array(13).fill(0n) },
        lifecycle: "terminated",
      },
      trace,
    );
    expect(result).toEqual([]);
  });

  it("handles panic termination kind", () => {
    const trace: EcalliTrace = {
      ...baseTrace,
      termination: {
        kind: "panic",
        arg: 1,
        pc: 5,
        gas: 100n,
        registers: new Map(),
      },
    };

    const result = compareFinalState(
      {
        snapshot: { pc: 5, gas: 100n, status: "panic", registers: Array(13).fill(0n) },
        lifecycle: "terminated",
      },
      trace,
    );
    expect(result).toEqual([]);
  });

  it("handles fault termination kind", () => {
    const trace: EcalliTrace = {
      ...baseTrace,
      termination: {
        kind: "fault",
        arg: 2,
        pc: 8,
        gas: 200n,
        registers: new Map(),
      },
    };

    const result = compareFinalState(
      {
        snapshot: { pc: 8, gas: 200n, status: "fault", registers: Array(13).fill(0n) },
        lifecycle: "terminated",
      },
      trace,
    );
    expect(result).toEqual([]);
  });

  it("reports mismatches for failed lifecycle with wrong status", () => {
    // A PVM with 'failed' lifecycle is terminal but its snapshot status
    // may not match the trace — this should produce mismatches
    const result = compareFinalState(
      {
        snapshot: { pc: 0, gas: 0n, status: "ok", registers: Array(13).fill(0n) },
        lifecycle: "failed",
      },
      baseTrace,
    );
    // Should report status, pc, gas, and register mismatches since the
    // snapshot doesn't match the trace termination
    expect(result.some((m) => m.field === "status")).toBe(true);
    expect(result.some((m) => m.field === "pc")).toBe(true);
  });

  it("reports multiple mismatches simultaneously", () => {
    const result = compareFinalState(
      {
        snapshot: { pc: 99, gas: 999n, status: "panic", registers: Array(13).fill(0n) },
        lifecycle: "terminated",
      },
      baseTrace,
    );
    // Should have status + pc + gas + register mismatches
    expect(result.length).toBeGreaterThanOrEqual(4);
    expect(result.find((m) => m.field === "status")).toBeDefined();
    expect(result.find((m) => m.field === "pc")).toBeDefined();
    expect(result.find((m) => m.field === "gas")).toBeDefined();
    expect(result.find((m) => m.field === "register[0]")).toBeDefined();
  });

  it("returns empty mismatches when trace has no termination", () => {
    const traceNoTerm: EcalliTrace = {
      ...baseTrace,
      termination: undefined,
    };

    const result = compareFinalState(
      {
        snapshot: { pc: 0, gas: 0n, status: "halt", registers: Array(13).fill(0n) },
        lifecycle: "terminated",
      },
      traceNoTerm,
    );
    expect(result).toEqual([]);
  });
});

describe("replay integration", () => {
  it("replays trace-001.log with typeberry", async () => {
    const traceFile = path.join(FIXTURES_DIR, "trace-001.log");
    const result = await replay(traceFile, {
      pvms: ["typeberry"],
      timeoutMs: 60000,
      verbose: false,
    });

    expect(result.trace).toBeDefined();
    expect(result.envelope).toBeDefined();
    expect(result.results.size).toBe(1);

    const pvmResult = result.results.get("typeberry");
    expect(pvmResult).toBeDefined();
    expect(pvmResult!.passed).toBe(true);
    expect(pvmResult!.mismatches).toEqual([]);
  }, 120000);

  it("replays io-trace-output.log with typeberry", async () => {
    const traceFile = path.join(FIXTURES_DIR, "io-trace-output.log");
    const result = await replay(traceFile, {
      pvms: ["typeberry"],
      timeoutMs: 60000,
      verbose: false,
    });

    expect(result.trace).toBeDefined();
    expect(result.envelope).toBeDefined();
    expect(result.results.size).toBe(1);

    const pvmResult = result.results.get("typeberry");
    expect(pvmResult).toBeDefined();
    expect(pvmResult!.passed).toBe(true);
    expect(pvmResult!.mismatches).toEqual([]);
  }, 120000);

  it("replays trace-001.log with ananas", async () => {
    const traceFile = path.join(FIXTURES_DIR, "trace-001.log");
    const result = await replay(traceFile, {
      pvms: ["ananas"],
      timeoutMs: 60000,
      verbose: false,
    });

    expect(result.results.size).toBe(1);
    const pvmResult = result.results.get("ananas");
    expect(pvmResult).toBeDefined();
    expect(pvmResult!.passed).toBe(true);
    expect(pvmResult!.mismatches).toEqual([]);
  }, 120000);

  it("replays trace-001.log with both PVMs", async () => {
    const traceFile = path.join(FIXTURES_DIR, "trace-001.log");
    const result = await replay(traceFile, {
      pvms: ["typeberry", "ananas"],
      timeoutMs: 60000,
      verbose: false,
    });

    expect(result.results.size).toBe(2);
    for (const [, pvmResult] of result.results) {
      expect(pvmResult.passed).toBe(true);
    }
  }, 120000);

  it("accepts a logger callback for verbose output", async () => {
    const logs: string[] = [];
    const traceFile = path.join(FIXTURES_DIR, "trace-001.log");
    const result = await replay(traceFile, {
      pvms: ["typeberry"],
      timeoutMs: 60000,
      verbose: true,
      logger: (msg) => logs.push(msg),
    });

    expect(result.results.get("typeberry")!.passed).toBe(true);
    // Verbose mode should produce host-call and completion logs
    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((l) => l.includes("Replay completed"))).toBe(true);
  }, 120000);

  it("throws on missing trace file", async () => {
    await expect(
      replay("/nonexistent/path.log", {
        pvms: ["typeberry"],
        timeoutMs: 5000,
        verbose: false,
      }),
    ).rejects.toThrow();
  });
});
