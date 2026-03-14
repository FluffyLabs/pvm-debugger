import { describe, it, expect } from "vitest";
import { PVM_STATUSES, TERMINAL_LIFECYCLES, isTerminal } from "./index.js";
import type { PvmStatus, PvmLifecycle } from "./index.js";

describe("PVM_STATUSES", () => {
  it("contains exactly 6 status values", () => {
    expect(PVM_STATUSES).toHaveLength(6);
  });

  it("includes all expected statuses", () => {
    const expected: PvmStatus[] = ["ok", "halt", "panic", "fault", "host", "out_of_gas"];
    expect([...PVM_STATUSES]).toEqual(expected);
  });
});

describe("isTerminal", () => {
  it("returns true for terminal lifecycle states", () => {
    for (const state of TERMINAL_LIFECYCLES) {
      expect(isTerminal(state)).toBe(true);
    }
  });

  it("returns false for non-terminal lifecycle states", () => {
    const nonTerminal: PvmLifecycle[] = ["paused", "running", "paused_host_call"];
    for (const state of nonTerminal) {
      expect(isTerminal(state)).toBe(false);
    }
  });
});
