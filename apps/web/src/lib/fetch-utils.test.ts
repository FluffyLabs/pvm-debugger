import { describe, it, expect } from "vitest";
import { NONE, formatRegValue, safeFromHex } from "./fetch-utils";

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
