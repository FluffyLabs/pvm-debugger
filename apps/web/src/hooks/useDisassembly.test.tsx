import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { ProgramEnvelope } from "@pvmdbg/types";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useDisassembly } from "./useDisassembly";

const fixturesDir = resolve(__dirname, "../../../../fixtures");

function makeEnvelope(programBytes: Uint8Array): ProgramEnvelope {
  return {
    programKind: "generic",
    programBytes,
    initialState: {
      pc: 0,
      gas: 1_000_000n,
      registers: Array(13).fill(0n),
      pageMap: [],
      memoryChunks: [],
    },
    sourceMeta: { sourceKind: "example", sourceId: "test" },
  };
}

describe("useDisassembly", () => {
  it("returns empty array for null envelope", () => {
    const { result } = renderHook(() => useDisassembly(null));
    expect(result.current).toEqual([]);
  });

  it("args use omega notation, rawArgs use numeric indices", () => {
    const bytes = new Uint8Array(
      readFileSync(resolve(fixturesDir, "generic/add.pvm")),
    );
    const envelope = makeEnvelope(bytes);
    const { result } = renderHook(() => useDisassembly(envelope));

    const instructions = result.current;
    expect(instructions.length).toBeGreaterThan(0);

    // Find instructions that have register arguments
    const withRegArgs = instructions.filter((i) => i.args.includes("ω"));
    expect(withRegArgs.length).toBeGreaterThan(0);

    for (const instr of withRegArgs) {
      // ASM args should contain omega
      expect(instr.args).toMatch(/ω\d+/);
      // Raw args should NOT contain omega, should contain plain numbers
      expect(instr.rawArgs).not.toContain("ω");
      // Raw args should be non-empty (they have register operands)
      expect(instr.rawArgs.length).toBeGreaterThan(0);
    }
  });

  it("instructions with no args have empty args and rawArgs", () => {
    const bytes = new Uint8Array(
      readFileSync(resolve(fixturesDir, "generic/add.pvm")),
    );
    const envelope = makeEnvelope(bytes);
    const { result } = renderHook(() => useDisassembly(envelope));

    const instructions = result.current;
    // Find a no-arg instruction (like trap)
    const noArgInstr = instructions.filter((i) => i.args === "");
    // At least some instructions should have no args
    for (const instr of noArgInstr) {
      expect(instr.rawArgs).toBe("");
    }
  });

  it("all instructions have rawBytes populated", () => {
    const bytes = new Uint8Array(
      readFileSync(resolve(fixturesDir, "generic/add.pvm")),
    );
    const envelope = makeEnvelope(bytes);
    const { result } = renderHook(() => useDisassembly(envelope));

    for (const instr of result.current) {
      expect(instr.rawBytes.length).toBeGreaterThan(0);
      expect(instr.opcode).toBe(instr.rawBytes[0]);
    }
  });
});
