import { describe, it, expect } from "vitest";
import { stepsForMode } from "./useDebuggerActions";

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
