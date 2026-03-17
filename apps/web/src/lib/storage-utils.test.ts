import { describe, it, expect } from "vitest";
import type { HostCallInfo, HostCallResumeProposal, MachineStateSnapshot } from "@pvmdbg/types";
import { deriveKeyHex } from "./storage-utils";

const EMPTY_SNAPSHOT: MachineStateSnapshot = {
  pc: 0,
  gas: 0n,
  status: "ok",
  registers: Array(13).fill(0n),
};

function makeHostCallInfo(overrides: Partial<HostCallInfo> = {}): HostCallInfo {
  return {
    pvmId: "test",
    hostCallIndex: 3,
    hostCallName: "read",
    currentState: EMPTY_SNAPSHOT,
    ...overrides,
  };
}

describe("deriveKeyHex", () => {
  it("returns null when no resume proposal exists", () => {
    const info = makeHostCallInfo({ resumeProposal: undefined });
    expect(deriveKeyHex(info)).toBeNull();
  });

  it("returns null for non-storage host calls (index 0)", () => {
    const info = makeHostCallInfo({
      hostCallIndex: 0,
      resumeProposal: {
        registerWrites: new Map(),
        memoryWrites: [{ address: 100, data: new Uint8Array([0xab, 0xcd]) }],
        traceMatches: true,
        mismatches: [],
      },
    });
    expect(deriveKeyHex(info)).toBeNull();
  });

  it("derives key for read host call (index 3) from ω8/ω9", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[8] = 0x1000n; // key ptr
    regs[9] = 4n; // key len

    const info = makeHostCallInfo({
      hostCallIndex: 3,
      currentState: { ...EMPTY_SNAPSHOT, registers: regs },
      resumeProposal: {
        registerWrites: new Map(),
        memoryWrites: [
          { address: 0x1000, data: new Uint8Array([0xde, 0xad, 0xbe, 0xef, 0xff]) },
        ],
        traceMatches: true,
        mismatches: [],
      },
    });
    expect(deriveKeyHex(info)).toBe("0xdeadbeef");
  });

  it("derives key for write host call (index 4) from ω7/ω8", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[7] = 0x2000n; // key ptr
    regs[8] = 2n; // key len

    const info = makeHostCallInfo({
      hostCallIndex: 4,
      hostCallName: "write",
      currentState: { ...EMPTY_SNAPSHOT, registers: regs },
      resumeProposal: {
        registerWrites: new Map(),
        memoryWrites: [
          { address: 0x2000, data: new Uint8Array([0xab, 0xcd]) },
        ],
        traceMatches: true,
        mismatches: [],
      },
    });
    expect(deriveKeyHex(info)).toBe("0xabcd");
  });

  it("returns null when no memory write matches key pointer", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[8] = 0x1000n;
    regs[9] = 4n;

    const info = makeHostCallInfo({
      hostCallIndex: 3,
      currentState: { ...EMPTY_SNAPSHOT, registers: regs },
      resumeProposal: {
        registerWrites: new Map(),
        memoryWrites: [
          { address: 0x9999, data: new Uint8Array([0xde, 0xad, 0xbe, 0xef]) },
        ],
        traceMatches: true,
        mismatches: [],
      },
    });
    expect(deriveKeyHex(info)).toBeNull();
  });

  it("returns null when memory write is too short for key length", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[8] = 0x1000n;
    regs[9] = 4n;

    const info = makeHostCallInfo({
      hostCallIndex: 3,
      currentState: { ...EMPTY_SNAPSHOT, registers: regs },
      resumeProposal: {
        registerWrites: new Map(),
        memoryWrites: [
          { address: 0x1000, data: new Uint8Array([0xde, 0xad]) },
        ],
        traceMatches: true,
        mismatches: [],
      },
    });
    expect(deriveKeyHex(info)).toBeNull();
  });

  it("slices key to exact length when memory write is longer", () => {
    const regs = Array(13).fill(0n) as bigint[];
    regs[8] = 0x1000n;
    regs[9] = 2n; // only 2 bytes

    const info = makeHostCallInfo({
      hostCallIndex: 3,
      currentState: { ...EMPTY_SNAPSHOT, registers: regs },
      resumeProposal: {
        registerWrites: new Map(),
        memoryWrites: [
          { address: 0x1000, data: new Uint8Array([0xca, 0xfe, 0xba, 0xbe]) },
        ],
        traceMatches: true,
        mismatches: [],
      },
    });
    expect(deriveKeyHex(info)).toBe("0xcafe");
  });
});
