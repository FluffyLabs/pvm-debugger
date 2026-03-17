import { describe, it, expect } from "vitest";
import { stepsForMode, proposalToEffects, shouldAutoContinue, hasHostCallPause } from "./useDebuggerActions";
import type { StepResult, PvmStepReport, HostCallResumeProposal, MachineStateSnapshot } from "@pvmdbg/types";

describe("stepsForMode", () => {
  it("returns 1 for instruction mode", () => {
    expect(stepsForMode("instruction", 99)).toBe(1);
  });

  it("returns 10 for block mode (temporary placeholder)", () => {
    expect(stepsForMode("block", 99)).toBe(10);
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
