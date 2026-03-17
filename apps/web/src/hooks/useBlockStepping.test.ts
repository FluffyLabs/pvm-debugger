import { describe, it, expect } from "vitest";
import {
  computeBlockStepCount,
  buildBlocksFromInstructions,
  computeMultiPvmBlockStepCount,
} from "./useBlockStepping";
import type { BasicBlock } from "./useBasicBlocks";
import type { DecodedInstruction } from "./useDisassembly";
import type { MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";

// --- Test helpers ---

function makeInstruction(pc: number, blockIndex: number): DecodedInstruction {
  return {
    pc,
    opcode: 0,
    mnemonic: "nop",
    rawBytes: new Uint8Array([0]),
    args: "",
    rawArgs: "",
    blockIndex,
  };
}

function makeBlock(index: number, pcs: number[]): BasicBlock {
  return {
    index,
    startPc: pcs[0],
    endPc: pcs[pcs.length - 1],
    instructions: pcs.map((pc) => makeInstruction(pc, index)),
    isCollapsed: false,
  };
}

const EMPTY_SNAPSHOT: MachineStateSnapshot = {
  pc: 0,
  gas: 0n,
  status: "ok",
  registers: Array(13).fill(0n),
};

function makeSnapshots(
  entries: Array<{ pvmId: string; pc: number; lifecycle: PvmLifecycle }>,
): Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }> {
  const map = new Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }>();
  for (const e of entries) {
    map.set(e.pvmId, {
      snapshot: { ...EMPTY_SNAPSHOT, pc: e.pc },
      lifecycle: e.lifecycle,
    });
  }
  return map;
}

// --- computeBlockStepCount ---

describe("computeBlockStepCount", () => {
  it("returns remaining count from mid-block", () => {
    // Block 0: pcs [0, 2, 5]  (3 instructions)
    const blocks = [makeBlock(0, [0, 2, 5]), makeBlock(1, [8, 10])];

    // At pc=0, remaining = 3 (instructions at pc 0, 2, 5)
    expect(computeBlockStepCount(blocks, 0)).toBe(3);
    // At pc=2, remaining = 2 (instructions at pc 2, 5)
    expect(computeBlockStepCount(blocks, 2)).toBe(2);
    // At pc=5, remaining = 1 (last instruction in block)
    expect(computeBlockStepCount(blocks, 5)).toBe(1);
  });

  it("returns remaining count for second block", () => {
    const blocks = [makeBlock(0, [0, 2, 5]), makeBlock(1, [8, 10, 12, 15])];

    expect(computeBlockStepCount(blocks, 8)).toBe(4);
    expect(computeBlockStepCount(blocks, 10)).toBe(3);
    expect(computeBlockStepCount(blocks, 15)).toBe(1);
  });

  it("returns 1 when PC is outside every known block", () => {
    const blocks = [makeBlock(0, [0, 2, 5])];
    expect(computeBlockStepCount(blocks, 99)).toBe(1);
  });

  it("returns 1 when there are no blocks", () => {
    expect(computeBlockStepCount([], 0)).toBe(1);
  });

  it("returns 1 for a single-instruction block", () => {
    const blocks = [makeBlock(0, [42])];
    expect(computeBlockStepCount(blocks, 42)).toBe(1);
  });
});

// --- buildBlocksFromInstructions ---

describe("buildBlocksFromInstructions", () => {
  it("groups instructions by blockIndex", () => {
    const instructions = [
      makeInstruction(0, 0),
      makeInstruction(2, 0),
      makeInstruction(5, 1),
      makeInstruction(8, 1),
      makeInstruction(10, 2),
    ];
    const blocks = buildBlocksFromInstructions(instructions);

    expect(blocks).toHaveLength(3);
    expect(blocks[0].index).toBe(0);
    expect(blocks[0].startPc).toBe(0);
    expect(blocks[0].endPc).toBe(2);
    expect(blocks[0].instructions).toHaveLength(2);

    expect(blocks[1].index).toBe(1);
    expect(blocks[1].startPc).toBe(5);
    expect(blocks[1].endPc).toBe(8);
    expect(blocks[1].instructions).toHaveLength(2);

    expect(blocks[2].index).toBe(2);
    expect(blocks[2].startPc).toBe(10);
    expect(blocks[2].endPc).toBe(10);
    expect(blocks[2].instructions).toHaveLength(1);
  });

  it("returns empty array for empty instructions", () => {
    expect(buildBlocksFromInstructions([])).toEqual([]);
  });
});

// --- computeMultiPvmBlockStepCount ---

describe("computeMultiPvmBlockStepCount", () => {
  const blocks = [
    makeBlock(0, [0, 2, 5]),     // 3 instructions
    makeBlock(1, [8, 10, 12, 15]), // 4 instructions
  ];

  it("uses smallest remaining count across paused PVMs", () => {
    const snapshots = makeSnapshots([
      { pvmId: "pvm1", pc: 0, lifecycle: "paused" }, // remaining = 3
      { pvmId: "pvm2", pc: 10, lifecycle: "paused" }, // remaining = 3
    ]);
    expect(computeMultiPvmBlockStepCount(blocks, snapshots)).toBe(3);
  });

  it("picks the smaller of two different remaining counts", () => {
    const snapshots = makeSnapshots([
      { pvmId: "pvm1", pc: 2, lifecycle: "paused" }, // remaining = 2
      { pvmId: "pvm2", pc: 8, lifecycle: "paused" }, // remaining = 4
    ]);
    expect(computeMultiPvmBlockStepCount(blocks, snapshots)).toBe(2);
  });

  it("returns 1 when there are no paused PVM snapshots", () => {
    const snapshots = makeSnapshots([]);
    expect(computeMultiPvmBlockStepCount(blocks, snapshots)).toBe(1);
  });

  it("returns 1 when all PVMs are terminal", () => {
    const snapshots = makeSnapshots([
      { pvmId: "pvm1", pc: 0, lifecycle: "terminated" },
      { pvmId: "pvm2", pc: 8, lifecycle: "failed" },
    ]);
    expect(computeMultiPvmBlockStepCount(blocks, snapshots)).toBe(1);
  });

  it("ignores terminal PVMs and uses only paused ones", () => {
    const snapshots = makeSnapshots([
      { pvmId: "pvm1", pc: 0, lifecycle: "terminated" }, // ignored
      { pvmId: "pvm2", pc: 10, lifecycle: "paused" },    // remaining = 3
    ]);
    expect(computeMultiPvmBlockStepCount(blocks, snapshots)).toBe(3);
  });

  it("considers paused_host_call PVMs", () => {
    const snapshots = makeSnapshots([
      { pvmId: "pvm1", pc: 5, lifecycle: "paused" },          // remaining = 1
      { pvmId: "pvm2", pc: 8, lifecycle: "paused_host_call" }, // remaining = 4
    ]);
    expect(computeMultiPvmBlockStepCount(blocks, snapshots)).toBe(1);
  });

  it("falls back to 1 when a PVM has an unknown PC", () => {
    const snapshots = makeSnapshots([
      { pvmId: "pvm1", pc: 99, lifecycle: "paused" }, // unknown PC → 1
      { pvmId: "pvm2", pc: 8, lifecycle: "paused" },  // remaining = 4
    ]);
    expect(computeMultiPvmBlockStepCount(blocks, snapshots)).toBe(1);
  });

  it("single PVM at start of block returns full block length", () => {
    const snapshots = makeSnapshots([
      { pvmId: "pvm1", pc: 8, lifecycle: "paused" }, // remaining = 4
    ]);
    expect(computeMultiPvmBlockStepCount(blocks, snapshots)).toBe(4);
  });
});
