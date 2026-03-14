import { describe, it, expect } from "vitest";
import { detectFormat } from "./index.js";
import type { ContainerFormat } from "./index.js";

describe("detectFormat", () => {
  it("detects trace files by 'program 0x' marker", () => {
    const data = new TextEncoder().encode("program 0xaabb\ngas 1000\n");
    expect(detectFormat(data)).toBe("trace_file" satisfies ContainerFormat);
  });

  it("detects JSON test vectors", () => {
    const json = JSON.stringify({
      "program": [0, 1, 2],
      "initial-regs": [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      "initial-pc": 0,
      "initial-gas": 1000,
    });
    const data = new TextEncoder().encode(json);
    expect(detectFormat(data)).toBe("json_test_vector" satisfies ContainerFormat);
  });

  it("falls back to generic_pvm for binary data", () => {
    const data = new Uint8Array([0x00, 0x01, 0xff, 0xfe, 0x80]);
    expect(detectFormat(data)).toBe("generic_pvm" satisfies ContainerFormat);
  });

  it("falls back to generic_pvm for non-matching text", () => {
    const data = new TextEncoder().encode("just some text");
    expect(detectFormat(data)).toBe("generic_pvm" satisfies ContainerFormat);
  });
});
