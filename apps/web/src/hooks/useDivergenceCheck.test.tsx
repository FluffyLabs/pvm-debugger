import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDivergenceCheck } from "./useDivergenceCheck";
import type { MachineStateSnapshot, PvmLifecycle } from "@pvmdbg/types";

function makeSnapshot(overrides?: Partial<MachineStateSnapshot>): MachineStateSnapshot {
  return {
    pc: 0,
    gas: 1_000_000n,
    status: "ok",
    registers: Array(13).fill(0n),
    ...overrides,
  };
}

function makeSnapshots(
  entries: Array<[string, PvmLifecycle, Partial<MachineStateSnapshot>?]>,
): Map<string, { snapshot: MachineStateSnapshot; lifecycle: PvmLifecycle }> {
  return new Map(
    entries.map(([id, lifecycle, overrides]) => [id, { snapshot: makeSnapshot(overrides), lifecycle }]),
  );
}

describe("useDivergenceCheck", () => {
  it("returns null when fewer than 2 PVMs are active", () => {
    const snapshots = makeSnapshots([["typeberry", "paused"]]);
    const { result } = renderHook(() => useDivergenceCheck(snapshots, "typeberry", 0));
    expect(result.current.summary).toBeNull();
    expect(result.current.details).toBeNull();
  });

  it("returns null when no selectedPvmId", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused"],
      ["ananas", "paused"],
    ]);
    const { result } = renderHook(() => useDivergenceCheck(snapshots, null, 0));
    expect(result.current.summary).toBeNull();
    expect(result.current.details).toBeNull();
  });

  it("returns null when PVMs agree on all fields", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused"],
      ["ananas", "paused"],
    ]);
    const { result } = renderHook(() => useDivergenceCheck(snapshots, "typeberry", 0));
    expect(result.current.summary).toBeNull();
    expect(result.current.details).toBeNull();
  });

  it("detects PC divergence", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused", { pc: 4 }],
      ["ananas", "paused", { pc: 8 }],
    ]);
    const { result } = renderHook(() => useDivergenceCheck(snapshots, "typeberry", 0));
    expect(result.current.summary).toBe("PC");
    expect(result.current.details).toContain("PC:");
    expect(result.current.details).toContain("0x4");
    expect(result.current.details).toContain("0x8");
  });

  it("detects gas divergence", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused", { gas: 999_996n }],
      ["ananas", "paused", { gas: 999_998n }],
    ]);
    const { result } = renderHook(() => useDivergenceCheck(snapshots, "typeberry", 0));
    expect(result.current.summary).toBe("Gas");
    expect(result.current.details).toContain("Gas:");
  });

  it("detects status/lifecycle divergence", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused", { status: "ok" }],
      ["ananas", "terminated", { status: "halt" }],
    ]);
    const { result } = renderHook(() => useDivergenceCheck(snapshots, "typeberry", 0));
    expect(result.current.summary).toContain("Status");
    expect(result.current.details).toContain("Status:");
  });

  it("detects register divergence and shows count", () => {
    const regs1 = Array(13).fill(0n);
    regs1[3] = 5n;
    regs1[7] = 10n;
    const regs2 = Array(13).fill(0n);
    regs2[3] = 99n;
    regs2[7] = 200n;

    const snapshots = makeSnapshots([
      ["typeberry", "paused", { registers: regs1 }],
      ["ananas", "paused", { registers: regs2 }],
    ]);
    const { result } = renderHook(() => useDivergenceCheck(snapshots, "typeberry", 0));
    expect(result.current.summary).toBe("2 registers");
    expect(result.current.details).toContain("ω3:");
    expect(result.current.details).toContain("ω7:");
  });

  it("shows 1 register for single register divergence", () => {
    const regs1 = Array(13).fill(0n);
    regs1[0] = 42n;
    const regs2 = Array(13).fill(0n);

    const snapshots = makeSnapshots([
      ["typeberry", "paused", { registers: regs1 }],
      ["ananas", "paused", { registers: regs2 }],
    ]);
    const { result } = renderHook(() => useDivergenceCheck(snapshots, "typeberry", 0));
    expect(result.current.summary).toBe("1 register");
  });

  it("combines multiple divergences in concise summary", () => {
    const regs = Array(13).fill(0n);
    regs[5] = 1n;

    const snapshots = makeSnapshots([
      ["typeberry", "paused", { pc: 4, gas: 999n, registers: regs }],
      ["ananas", "paused", { pc: 8, gas: 500n }],
    ]);
    const { result } = renderHook(() => useDivergenceCheck(snapshots, "typeberry", 0));
    expect(result.current.summary).toBe("PC, Gas, 1 register");
  });

  it("uses PC (not Pc) in user-facing text", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused", { pc: 4 }],
      ["ananas", "paused", { pc: 8 }],
    ]);
    const { result } = renderHook(() => useDivergenceCheck(snapshots, "typeberry", 0));
    expect(result.current.summary).toContain("PC");
    expect(result.current.summary).not.toContain("Pc");
  });

  it("returns null when selectedPvmId is not in snapshots", () => {
    const snapshots = makeSnapshots([
      ["typeberry", "paused"],
      ["ananas", "paused"],
    ]);
    const { result } = renderHook(() => useDivergenceCheck(snapshots, "missing", 0));
    expect(result.current.summary).toBeNull();
  });
});
