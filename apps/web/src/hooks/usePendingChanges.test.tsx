import type {
  HostCallInfo,
  HostCallResumeProposal,
  MachineStateSnapshot,
} from "@pvmdbg/types";
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePendingChanges } from "./usePendingChanges";

function makeSnapshot(): MachineStateSnapshot {
  return {
    pc: 0,
    gas: 1_000_000n,
    status: "host",
    registers: Array(13).fill(0n),
  };
}

function makeHostCallInfo(overrides?: {
  resumeProposal?: HostCallResumeProposal;
}): HostCallInfo {
  return {
    pvmId: "pvm-a",
    hostCallIndex: 3,
    hostCallName: "read",
    currentState: makeSnapshot(),
    ...overrides,
  };
}

function makeProposal(
  overrides?: Partial<HostCallResumeProposal>,
): HostCallResumeProposal {
  return {
    registerWrites: new Map([[7, 42n]]),
    memoryWrites: [{ address: 0x100, data: new Uint8Array([1, 2, 3]) }],
    gasAfter: 500_000n,
    traceMatches: true,
    mismatches: [],
    ...overrides,
  };
}

describe("usePendingChanges", () => {
  it("returns null pending when no host call is active", () => {
    const { result } = renderHook(() => usePendingChanges(new Map(), null));
    expect(result.current.pending).toBeNull();
    expect(result.current.getEffects()).toBeNull();
  });

  it("initializes from resume proposal", () => {
    const proposal = makeProposal();
    const info = makeHostCallInfo({ resumeProposal: proposal });
    const hcMap = new Map([["pvm-a", info]]);

    const { result } = renderHook(() => usePendingChanges(hcMap, "pvm-a"));

    expect(result.current.pending).not.toBeNull();
    expect(result.current.pending?.registerWrites.get(7)).toBe(42n);
    expect(result.current.pending?.gasAfter).toBe(500_000n);
    expect(result.current.pending?.memoryWrites).toHaveLength(1);
  });

  it("initializes empty when host call has no proposal", () => {
    const info = makeHostCallInfo();
    const hcMap = new Map([["pvm-a", info]]);

    const { result } = renderHook(() => usePendingChanges(hcMap, "pvm-a"));

    expect(result.current.pending).not.toBeNull();
    expect(result.current.pending?.registerWrites.size).toBe(0);
    expect(result.current.pending?.memoryWrites).toHaveLength(0);
    expect(result.current.pending?.gasAfter).toBeUndefined();
  });

  it("setRegister updates pending state", () => {
    const info = makeHostCallInfo({ resumeProposal: makeProposal() });
    const hcMap = new Map([["pvm-a", info]]);

    const { result } = renderHook(() => usePendingChanges(hcMap, "pvm-a"));

    act(() => result.current.setRegister(3, 99n));

    expect(result.current.pending?.registerWrites.get(3)).toBe(99n);
    // Original proposal register unchanged
    expect(result.current.pending?.registerWrites.get(7)).toBe(42n);
  });

  it("setRegister overrides proposal value for same register", () => {
    const info = makeHostCallInfo({ resumeProposal: makeProposal() });
    const hcMap = new Map([["pvm-a", info]]);

    const { result } = renderHook(() => usePendingChanges(hcMap, "pvm-a"));

    act(() => result.current.setRegister(7, 999n));

    expect(result.current.pending?.registerWrites.get(7)).toBe(999n);
  });

  it("setGas updates pending state", () => {
    const info = makeHostCallInfo({ resumeProposal: makeProposal() });
    const hcMap = new Map([["pvm-a", info]]);

    const { result } = renderHook(() => usePendingChanges(hcMap, "pvm-a"));

    act(() => result.current.setGas(123_456n));

    expect(result.current.pending?.gasAfter).toBe(123_456n);
  });

  it("writeMemory appends new write", () => {
    const info = makeHostCallInfo({ resumeProposal: makeProposal() });
    const hcMap = new Map([["pvm-a", info]]);

    const { result } = renderHook(() => usePendingChanges(hcMap, "pvm-a"));

    act(() => result.current.writeMemory(0x200, new Uint8Array([0xff])));

    expect(result.current.pending?.memoryWrites).toHaveLength(2);
    expect(result.current.pending?.memoryWrites[1].address).toBe(0x200);
  });

  it("writeMemory replaces existing write at same address", () => {
    const info = makeHostCallInfo({ resumeProposal: makeProposal() });
    const hcMap = new Map([["pvm-a", info]]);

    const { result } = renderHook(() => usePendingChanges(hcMap, "pvm-a"));

    act(() => result.current.writeMemory(0x100, new Uint8Array([0xaa, 0xbb])));

    expect(result.current.pending?.memoryWrites).toHaveLength(1);
    expect(result.current.pending?.memoryWrites[0].data).toEqual(
      new Uint8Array([0xaa, 0xbb]),
    );
  });

  it("getEffects returns current state", () => {
    const info = makeHostCallInfo({ resumeProposal: makeProposal() });
    const hcMap = new Map([["pvm-a", info]]);

    const { result } = renderHook(() => usePendingChanges(hcMap, "pvm-a"));

    act(() => result.current.setRegister(3, 77n));

    const effects = result.current.getEffects();
    expect(effects).not.toBeNull();
    expect(effects?.registerWrites?.get(3)).toBe(77n);
    expect(effects?.registerWrites?.get(7)).toBe(42n);
    expect(effects?.gasAfter).toBe(500_000n);
  });

  it("clear resets pending to null", () => {
    const info = makeHostCallInfo({ resumeProposal: makeProposal() });
    const hcMap = new Map([["pvm-a", info]]);

    const { result } = renderHook(() => usePendingChanges(hcMap, "pvm-a"));

    expect(result.current.pending).not.toBeNull();

    act(() => result.current.clear());

    expect(result.current.pending).toBeNull();
    expect(result.current.getEffects()).toBeNull();
  });

  it("setters are no-ops when pending is null", () => {
    const { result } = renderHook(() => usePendingChanges(new Map(), null));

    // Should not throw
    act(() => {
      result.current.setRegister(0, 1n);
      result.current.setGas(1n);
      result.current.writeMemory(0, new Uint8Array([1]));
    });

    expect(result.current.pending).toBeNull();
  });

  it("reinitializes when host call info changes", () => {
    const proposal1 = makeProposal({ registerWrites: new Map([[7, 10n]]) });
    const info1 = makeHostCallInfo({ resumeProposal: proposal1 });

    const proposal2 = makeProposal({ registerWrites: new Map([[7, 20n]]) });
    const info2 = makeHostCallInfo({ resumeProposal: proposal2 });

    let hcMap = new Map([["pvm-a", info1]]);
    const { result, rerender } = renderHook(() =>
      usePendingChanges(hcMap, "pvm-a"),
    );

    expect(result.current.pending?.registerWrites.get(7)).toBe(10n);

    // Simulate new host call
    hcMap = new Map([["pvm-a", info2]]);
    rerender();

    expect(result.current.pending?.registerWrites.get(7)).toBe(20n);
  });

  it("removeMemoryWrite removes write at given address", () => {
    const info = makeHostCallInfo({ resumeProposal: makeProposal() });
    const hcMap = new Map([["pvm-a", info]]);

    const { result } = renderHook(() => usePendingChanges(hcMap, "pvm-a"));

    expect(result.current.pending?.memoryWrites).toHaveLength(1);
    expect(result.current.pending?.memoryWrites[0].address).toBe(0x100);

    act(() => result.current.removeMemoryWrite(0x100));

    expect(result.current.pending?.memoryWrites).toHaveLength(0);
  });

  it("removeMemoryWrite is no-op for non-existent address", () => {
    const info = makeHostCallInfo({ resumeProposal: makeProposal() });
    const hcMap = new Map([["pvm-a", info]]);

    const { result } = renderHook(() => usePendingChanges(hcMap, "pvm-a"));

    act(() => result.current.removeMemoryWrite(0x999));

    expect(result.current.pending?.memoryWrites).toHaveLength(1);
  });

  it("removeMemoryWrite is no-op when pending is null", () => {
    const { result } = renderHook(() => usePendingChanges(new Map(), null));

    // Should not throw
    act(() => result.current.removeMemoryWrite(0x100));
    expect(result.current.pending).toBeNull();
  });

  it("clears pending when host call is removed", () => {
    const info = makeHostCallInfo({ resumeProposal: makeProposal() });
    let hcMap: Map<string, HostCallInfo> = new Map([["pvm-a", info]]);

    const { result, rerender } = renderHook(() =>
      usePendingChanges(hcMap, "pvm-a"),
    );

    expect(result.current.pending).not.toBeNull();

    hcMap = new Map();
    rerender();

    expect(result.current.pending).toBeNull();
  });
});
