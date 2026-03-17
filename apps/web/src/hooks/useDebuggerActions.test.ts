import { describe, it, expect, vi } from "vitest";
import { stepsForMode, proposalToEffects, shouldAutoContinue, hasHostCallPause, hasBreakpointHit, storageAwareEffects, persistWriteToStorage } from "./useDebuggerActions";
import type { StepResult, PvmStepReport, HostCallResumeProposal, HostCallInfo, MachineStateSnapshot } from "@pvmdbg/types";
import type { UseStorageTable } from "./useStorageTable";

describe("stepsForMode", () => {
  it("returns 1 for instruction mode", () => {
    expect(stepsForMode("instruction", 99)).toBe(1);
  });

  it("returns 1 for block mode fallback (real stepping uses computeBlockStepSize)", () => {
    expect(stepsForMode("block", 99)).toBe(1);
  });

  it("returns the configured count for n_instructions mode", () => {
    expect(stepsForMode("n_instructions", 5)).toBe(5);
    expect(stepsForMode("n_instructions", 100)).toBe(100);
    expect(stepsForMode("n_instructions", 1)).toBe(1);
  });
});

// --- Test helpers ---

const EMPTY_SNAPSHOT: MachineStateSnapshot = {
  pc: 0,
  gas: 0n,
  status: "ok",
  registers: Array(13).fill(0n),
};

function makeReport(overrides: Partial<PvmStepReport> = {}): PvmStepReport {
  return {
    pvmId: "test",
    lifecycle: "paused",
    snapshot: EMPTY_SNAPSHOT,
    stepsExecuted: 1,
    hitBreakpoint: false,
    ...overrides,
  };
}

function makeStepResult(reports: PvmStepReport[]): StepResult {
  const results = new Map<string, PvmStepReport>();
  for (const r of reports) {
    results.set(r.pvmId, r);
  }
  return { results };
}

// --- proposalToEffects ---

describe("proposalToEffects", () => {
  it("returns empty effects when proposal is undefined", () => {
    const effects = proposalToEffects(undefined);
    expect(effects.registerWrites).toBeUndefined();
    expect(effects.memoryWrites).toBeUndefined();
    expect(effects.gasAfter).toBeUndefined();
  });

  it("maps all proposal fields to effects", () => {
    const proposal: HostCallResumeProposal = {
      registerWrites: new Map([[7, 42n]]),
      memoryWrites: [{ address: 0x1000, data: new Uint8Array([1, 2, 3]) }],
      gasAfter: 500n,
      traceMatches: true,
      mismatches: [],
    };
    const effects = proposalToEffects(proposal);
    expect(effects.registerWrites).toBe(proposal.registerWrites);
    expect(effects.memoryWrites).toBe(proposal.memoryWrites);
    expect(effects.gasAfter).toBe(500n);
  });

  it("does not include traceMatches or mismatches in effects", () => {
    const proposal: HostCallResumeProposal = {
      registerWrites: new Map(),
      memoryWrites: [],
      traceMatches: false,
      mismatches: [{ field: "ecalliIndex", expected: "0", actual: "1" }],
    };
    const effects = proposalToEffects(proposal);
    expect(effects).not.toHaveProperty("traceMatches");
    expect(effects).not.toHaveProperty("mismatches");
  });

  it("preserves undefined gasAfter from proposal", () => {
    const proposal: HostCallResumeProposal = {
      registerWrites: new Map(),
      memoryWrites: [],
      traceMatches: true,
      mismatches: [],
    };
    const effects = proposalToEffects(proposal);
    expect(effects.gasAfter).toBeUndefined();
  });
});

// --- hasHostCallPause ---

describe("hasHostCallPause", () => {
  it("returns false when no PVMs are in host call state", () => {
    const result = makeStepResult([makeReport({ lifecycle: "paused" })]);
    expect(hasHostCallPause(result)).toBe(false);
  });

  it("returns true when a PVM is paused on host call", () => {
    const result = makeStepResult([
      makeReport({ pvmId: "pvm1", lifecycle: "paused_host_call" }),
    ]);
    expect(hasHostCallPause(result)).toBe(true);
  });

  it("returns true when one of multiple PVMs is paused on host call", () => {
    const result = makeStepResult([
      makeReport({ pvmId: "pvm1", lifecycle: "paused" }),
      makeReport({ pvmId: "pvm2", lifecycle: "paused_host_call" }),
    ]);
    expect(hasHostCallPause(result)).toBe(true);
  });

  it("returns false for terminal states", () => {
    const result = makeStepResult([
      makeReport({ pvmId: "pvm1", lifecycle: "terminated" }),
      makeReport({ pvmId: "pvm2", lifecycle: "failed" }),
    ]);
    expect(hasHostCallPause(result)).toBe(false);
  });

  it("returns false for an empty result set", () => {
    const result = makeStepResult([]);
    expect(hasHostCallPause(result)).toBe(false);
  });
});

// --- hasBreakpointHit ---

describe("hasBreakpointHit", () => {
  it("returns false when no PVMs hit a breakpoint", () => {
    const result = makeStepResult([makeReport({ hitBreakpoint: false })]);
    expect(hasBreakpointHit(result)).toBe(false);
  });

  it("returns true when a PVM hit a breakpoint", () => {
    const result = makeStepResult([
      makeReport({ pvmId: "pvm1", hitBreakpoint: true }),
    ]);
    expect(hasBreakpointHit(result)).toBe(true);
  });

  it("returns true when one of multiple PVMs hit a breakpoint", () => {
    const result = makeStepResult([
      makeReport({ pvmId: "pvm1", hitBreakpoint: false }),
      makeReport({ pvmId: "pvm2", hitBreakpoint: true }),
    ]);
    expect(hasBreakpointHit(result)).toBe(true);
  });

  it("returns false for an empty result set", () => {
    const result = makeStepResult([]);
    expect(hasBreakpointHit(result)).toBe(false);
  });
});

// --- shouldAutoContinue ---

describe("shouldAutoContinue", () => {
  const matchingProposal: HostCallResumeProposal = {
    registerWrites: new Map(),
    memoryWrites: [],
    traceMatches: true,
    mismatches: [],
  };

  const nonMatchingProposal: HostCallResumeProposal = {
    registerWrites: new Map(),
    memoryWrites: [],
    traceMatches: false,
    mismatches: [{ field: "ecalliIndex", expected: "0", actual: "1" }],
  };

  describe("never policy", () => {
    it("returns false regardless of trace state", () => {
      const result = makeStepResult([
        makeReport({
          pvmId: "pvm1",
          lifecycle: "paused_host_call",
          hostCall: {
            pvmId: "pvm1",
            hostCallIndex: 0,
            hostCallName: "gas",
            currentState: EMPTY_SNAPSHOT,
            resumeProposal: matchingProposal,
          },
        }),
      ]);
      expect(shouldAutoContinue("never", result)).toBe(false);
    });
  });

  describe("always_continue policy", () => {
    it("returns true even without a trace proposal", () => {
      const result = makeStepResult([
        makeReport({
          pvmId: "pvm1",
          lifecycle: "paused_host_call",
          hostCall: {
            pvmId: "pvm1",
            hostCallIndex: 0,
            hostCallName: "gas",
            currentState: EMPTY_SNAPSHOT,
          },
        }),
      ]);
      expect(shouldAutoContinue("always_continue", result)).toBe(true);
    });

    it("returns true even with a non-matching trace", () => {
      const result = makeStepResult([
        makeReport({
          pvmId: "pvm1",
          lifecycle: "paused_host_call",
          hostCall: {
            pvmId: "pvm1",
            hostCallIndex: 0,
            hostCallName: "gas",
            currentState: EMPTY_SNAPSHOT,
            resumeProposal: nonMatchingProposal,
          },
        }),
      ]);
      expect(shouldAutoContinue("always_continue", result)).toBe(true);
    });
  });

  describe("continue_when_trace_matches policy", () => {
    it("returns true when trace matches", () => {
      const result = makeStepResult([
        makeReport({
          pvmId: "pvm1",
          lifecycle: "paused_host_call",
          hostCall: {
            pvmId: "pvm1",
            hostCallIndex: 0,
            hostCallName: "gas",
            currentState: EMPTY_SNAPSHOT,
            resumeProposal: matchingProposal,
          },
        }),
      ]);
      expect(shouldAutoContinue("continue_when_trace_matches", result)).toBe(true);
    });

    it("returns false when trace does not match", () => {
      const result = makeStepResult([
        makeReport({
          pvmId: "pvm1",
          lifecycle: "paused_host_call",
          hostCall: {
            pvmId: "pvm1",
            hostCallIndex: 0,
            hostCallName: "gas",
            currentState: EMPTY_SNAPSHOT,
            resumeProposal: nonMatchingProposal,
          },
        }),
      ]);
      expect(shouldAutoContinue("continue_when_trace_matches", result)).toBe(false);
    });

    it("returns false when no trace proposal exists", () => {
      const result = makeStepResult([
        makeReport({
          pvmId: "pvm1",
          lifecycle: "paused_host_call",
          hostCall: {
            pvmId: "pvm1",
            hostCallIndex: 0,
            hostCallName: "gas",
            currentState: EMPTY_SNAPSHOT,
          },
        }),
      ]);
      expect(shouldAutoContinue("continue_when_trace_matches", result)).toBe(false);
    });

    it("returns false if ANY PVM has a non-matching trace in multi-PVM scenario", () => {
      const result = makeStepResult([
        makeReport({
          pvmId: "pvm1",
          lifecycle: "paused_host_call",
          hostCall: {
            pvmId: "pvm1",
            hostCallIndex: 0,
            hostCallName: "gas",
            currentState: EMPTY_SNAPSHOT,
            resumeProposal: matchingProposal,
          },
        }),
        makeReport({
          pvmId: "pvm2",
          lifecycle: "paused_host_call",
          hostCall: {
            pvmId: "pvm2",
            hostCallIndex: 1,
            hostCallName: "fetch",
            currentState: EMPTY_SNAPSHOT,
            resumeProposal: nonMatchingProposal,
          },
        }),
      ]);
      expect(shouldAutoContinue("continue_when_trace_matches", result)).toBe(false);
    });

    it("ignores non-host-call PVMs in the result", () => {
      const result = makeStepResult([
        makeReport({ pvmId: "pvm1", lifecycle: "paused" }),
        makeReport({
          pvmId: "pvm2",
          lifecycle: "paused_host_call",
          hostCall: {
            pvmId: "pvm2",
            hostCallIndex: 0,
            hostCallName: "gas",
            currentState: EMPTY_SNAPSHOT,
            resumeProposal: matchingProposal,
          },
        }),
      ]);
      expect(shouldAutoContinue("continue_when_trace_matches", result)).toBe(true);
    });
  });
});

// --- storageAwareEffects ---

function makeStorageTable(entries: Record<string, string> = {}): UseStorageTable {
  const map = new Map(Object.entries(entries));
  return {
    entries: [...map.entries()].map(([key, value]) => ({ key, value })),
    setEntry: vi.fn(),
    removeEntry: vi.fn(),
    hasEntry: (key: string) => map.has(key),
    clear: vi.fn(),
    store: {
      buildReadOverride: (key: string, addr: number) => {
        const val = map.get(key);
        if (val === undefined) return undefined;
        // Simple mock: return a memory write with the key as data
        return { memoryWrites: [{ address: addr, data: new Uint8Array([0x42]) }] };
      },
    } as UseStorageTable["store"],
  };
}

function makeHostCallInfo(overrides: Partial<HostCallInfo> = {}): HostCallInfo {
  return {
    pvmId: "test",
    hostCallIndex: 0,
    hostCallName: "gas",
    currentState: EMPTY_SNAPSHOT,
    ...overrides,
  };
}

describe("storageAwareEffects", () => {
  it("returns base effects for non-storage host calls", () => {
    const hc = makeHostCallInfo({
      hostCallIndex: 0,
      resumeProposal: {
        registerWrites: new Map([[7, 99n]]),
        memoryWrites: [],
        traceMatches: true,
        mismatches: [],
      },
    });
    const st = makeStorageTable();
    const effects = storageAwareEffects(hc, st);
    expect(effects.registerWrites?.get(7)).toBe(99n);
  });

  it("returns base effects for storage host call with no proposal", () => {
    const hc = makeHostCallInfo({ hostCallIndex: 3, resumeProposal: undefined });
    const st = makeStorageTable();
    const effects = storageAwareEffects(hc, st);
    expect(effects).toEqual({});
  });

  it("overrides memory writes for read (index 3) when custom value exists", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[8] = 0x1000n; // key ptr
    regs[9] = 2n; // key len

    const hc = makeHostCallInfo({
      hostCallIndex: 3,
      hostCallName: "read",
      currentState: { ...EMPTY_SNAPSHOT, registers: regs },
      resumeProposal: {
        registerWrites: new Map([[0, 1n]]),
        memoryWrites: [
          { address: 0x1000, data: new Uint8Array([0xab, 0xcd]) },
          { address: 0x2000, data: new Uint8Array([0x11, 0x22]) },
        ],
        traceMatches: true,
        mismatches: [],
      },
    });

    // The key is 0xabcd (derived from memory write at keyPtr)
    const st = makeStorageTable({ "0xabcd": "0x42" });
    const effects = storageAwareEffects(hc, st);

    // Should override memory writes with custom value
    expect(effects.memoryWrites).toHaveLength(1);
    expect(effects.memoryWrites![0].data).toEqual(new Uint8Array([0x42]));
    // Register writes should be preserved
    expect(effects.registerWrites?.get(0)).toBe(1n);
  });

  it("does NOT override for write (index 4) — only persists after resume", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[7] = 0x1000n;
    regs[8] = 2n;

    const hc = makeHostCallInfo({
      hostCallIndex: 4,
      hostCallName: "write",
      currentState: { ...EMPTY_SNAPSHOT, registers: regs },
      resumeProposal: {
        registerWrites: new Map(),
        memoryWrites: [
          { address: 0x1000, data: new Uint8Array([0xab, 0xcd]) },
        ],
        traceMatches: true,
        mismatches: [],
      },
    });

    const st = makeStorageTable({ "0xabcd": "0xff" });
    const effects = storageAwareEffects(hc, st);

    // Should return base effects unchanged for write host calls
    expect(effects.memoryWrites).toHaveLength(1);
    expect(effects.memoryWrites![0].address).toBe(0x1000);
  });

  it("returns base effects when storage table has no matching key", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[8] = 0x1000n;
    regs[9] = 2n;

    const hc = makeHostCallInfo({
      hostCallIndex: 3,
      currentState: { ...EMPTY_SNAPSHOT, registers: regs },
      resumeProposal: {
        registerWrites: new Map(),
        memoryWrites: [
          { address: 0x1000, data: new Uint8Array([0xab, 0xcd]) },
        ],
        traceMatches: true,
        mismatches: [],
      },
    });

    const st = makeStorageTable({ "0xdead": "0xff" }); // different key
    const effects = storageAwareEffects(hc, st);

    // Should use trace memory writes since key doesn't match
    expect(effects.memoryWrites).toHaveLength(1);
    expect(effects.memoryWrites![0].address).toBe(0x1000);
  });
});

// --- persistWriteToStorage ---

describe("persistWriteToStorage", () => {
  it("does nothing for non-write host calls", () => {
    const hc = makeHostCallInfo({ hostCallIndex: 3 });
    const st = makeStorageTable();
    persistWriteToStorage(hc, st);
    expect(st.setEntry).not.toHaveBeenCalled();
  });

  it("does nothing when no proposal exists", () => {
    const hc = makeHostCallInfo({ hostCallIndex: 4, resumeProposal: undefined });
    const st = makeStorageTable();
    persistWriteToStorage(hc, st);
    expect(st.setEntry).not.toHaveBeenCalled();
  });

  it("persists key/value to storage table for write host calls", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[7] = 0x1000n; // key ptr
    regs[8] = 2n; // key len
    regs[9] = 0x2000n; // val ptr
    regs[10] = 3n; // val len

    const hc = makeHostCallInfo({
      hostCallIndex: 4,
      hostCallName: "write",
      currentState: { ...EMPTY_SNAPSHOT, registers: regs },
      resumeProposal: {
        registerWrites: new Map(),
        memoryWrites: [
          { address: 0x1000, data: new Uint8Array([0xab, 0xcd]) }, // key
          { address: 0x2000, data: new Uint8Array([0x11, 0x22, 0x33, 0x44]) }, // value (longer than valLen)
        ],
        traceMatches: true,
        mismatches: [],
      },
    });

    const st = makeStorageTable();
    persistWriteToStorage(hc, st);

    expect(st.setEntry).toHaveBeenCalledWith("0xabcd", "0x112233");
  });

  it("does nothing when key cannot be derived", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[7] = 0x1000n;
    regs[8] = 2n;
    regs[9] = 0x2000n;
    regs[10] = 3n;

    const hc = makeHostCallInfo({
      hostCallIndex: 4,
      currentState: { ...EMPTY_SNAPSHOT, registers: regs },
      resumeProposal: {
        registerWrites: new Map(),
        memoryWrites: [
          // No memory write at key pointer address
          { address: 0x9999, data: new Uint8Array([0xab, 0xcd]) },
        ],
        traceMatches: true,
        mismatches: [],
      },
    });

    const st = makeStorageTable();
    persistWriteToStorage(hc, st);
    expect(st.setEntry).not.toHaveBeenCalled();
  });
});
