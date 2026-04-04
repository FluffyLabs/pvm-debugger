import { describe, it, expect } from "vitest";
import { NONE, formatRegValue, safeFromHex, computeFetchEffects } from "./fetch-utils";

describe("NONE constant", () => {
  it("equals 2^64 - 1", () => {
    expect(NONE).toBe((1n << 64n) - 1n);
    expect(NONE).toBe(18446744073709551615n);
  });
});

describe("formatRegValue", () => {
  it("formats hex values with 0x prefix", () => {
    expect(formatRegValue(255n, "hex")).toBe("0xff");
    expect(formatRegValue(0n, "hex")).toBe("0x0");
    expect(formatRegValue(0x1234n, "hex")).toBe("0x1234");
  });

  it("formats decimal values as plain numbers", () => {
    expect(formatRegValue(42n, "decimal")).toBe("42");
    expect(formatRegValue(0n, "decimal")).toBe("0");
    expect(formatRegValue(1000000n, "decimal")).toBe("1000000");
  });

  it("formats custom same as decimal", () => {
    expect(formatRegValue(99n, "custom")).toBe("99");
  });
});

describe("safeFromHex", () => {
  it("decodes valid hex with 0x prefix", () => {
    const result = safeFromHex("0xaabb");
    expect(Array.from(result)).toEqual([0xaa, 0xbb]);
  });

  it("decodes valid hex without 0x prefix", () => {
    const result = safeFromHex("ccdd");
    expect(Array.from(result)).toEqual([0xcc, 0xdd]);
  });

  it("pads odd-length hex with leading zero", () => {
    const result = safeFromHex("0xabc");
    expect(Array.from(result)).toEqual([0x0a, 0xbc]);
  });

  it("returns empty array for invalid hex", () => {
    const result = safeFromHex("not-hex");
    expect(result.length).toBe(0);
  });

  it("returns empty array for empty string", () => {
    const result = safeFromHex("");
    expect(result.length).toBe(0);
  });

  it("handles 0X uppercase prefix", () => {
    const result = safeFromHex("0XFF");
    expect(Array.from(result)).toEqual([0xff]);
  });
});

describe("computeFetchEffects", () => {
  it("returns NONE sentinel when isNone is true", () => {
    const effects = computeFetchEffects(new Uint8Array([1, 2, 3]), true, 0x1000, 0, 100);
    expect(effects.registerWrites.get(7)).toBe(NONE);
    expect(effects.memoryWrites.length).toBe(0);
  });

  it("returns full blob when offset=0 and maxLen >= blob.length", () => {
    const blob = new Uint8Array([0xAA, 0xBB, 0xCC]);
    const effects = computeFetchEffects(blob, false, 0x2000, 0, 100);
    expect(effects.registerWrites.get(7)).toBe(3n);
    expect(effects.memoryWrites.length).toBe(1);
    expect(effects.memoryWrites[0].address).toBe(0x2000);
    expect(Array.from(effects.memoryWrites[0].data)).toEqual([0xAA, 0xBB, 0xCC]);
  });

  it("slices correctly with offset and maxLen", () => {
    const blob = new Uint8Array([0x10, 0x20, 0x30, 0x40, 0x50]);
    const effects = computeFetchEffects(blob, false, 0x3000, 1, 2);
    expect(effects.registerWrites.get(7)).toBe(5n); // total length
    expect(effects.memoryWrites.length).toBe(1);
    expect(Array.from(effects.memoryWrites[0].data)).toEqual([0x20, 0x30]); // bytes[1..3)
  });

  it("produces no memory write when slice is empty", () => {
    const blob = new Uint8Array([1, 2]);
    const effects = computeFetchEffects(blob, false, 0x1000, 10, 5);
    expect(effects.registerWrites.get(7)).toBe(2n);
    expect(effects.memoryWrites.length).toBe(0);
  });

  it("handles empty blob", () => {
    const effects = computeFetchEffects(new Uint8Array(0), false, 0x1000, 0, 100);
    expect(effects.registerWrites.get(7)).toBe(0n);
    expect(effects.memoryWrites.length).toBe(0);
  });
});
