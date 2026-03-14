import { describe, it, expect } from "vitest";
import { WORKER_MESSAGE_TYPES, isWorkerMessageType } from "./index.js";

describe("WORKER_MESSAGE_TYPES", () => {
  it("contains all 5 message types", () => {
    expect(WORKER_MESSAGE_TYPES).toHaveLength(5);
    expect([...WORKER_MESSAGE_TYPES]).toContain("load");
    expect([...WORKER_MESSAGE_TYPES]).toContain("step");
    expect([...WORKER_MESSAGE_TYPES]).toContain("shutdown");
  });
});

describe("isWorkerMessageType", () => {
  it("returns true for valid message types", () => {
    for (const t of WORKER_MESSAGE_TYPES) {
      expect(isWorkerMessageType(t)).toBe(true);
    }
  });

  it("returns false for invalid strings", () => {
    expect(isWorkerMessageType("invalid")).toBe(false);
    expect(isWorkerMessageType("")).toBe(false);
    expect(isWorkerMessageType("LOAD")).toBe(false);
  });
});
