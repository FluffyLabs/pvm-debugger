import { describe, expect, it } from "vitest";
import {
  bytesToHex,
  formatGas,
  formatGasHex,
  formatPc,
  formatRegister,
  lifecycleLabel,
  parseBigintInput,
  parsePcInput,
} from "./value-format";

describe("formatRegister", () => {
  it("formats zero with 16-digit hex", () => {
    const { hex, decimal } = formatRegister(0n);
    expect(hex).toBe("0x0000000000000000");
    expect(decimal).toBe("0");
  });

  it("formats a small positive value", () => {
    const { hex, decimal } = formatRegister(42n);
    expect(hex).toBe("0x000000000000002a");
    expect(decimal).toBe("42");
  });

  it("formats max uint64", () => {
    const maxU64 = (1n << 64n) - 1n;
    const { hex, decimal } = formatRegister(maxU64);
    expect(hex).toBe("0xffffffffffffffff");
    expect(decimal).toBe("18446744073709551615");
  });

  it("wraps negative values to unsigned 64-bit", () => {
    const { hex, decimal } = formatRegister(-1n);
    expect(hex).toBe("0xffffffffffffffff");
    expect(decimal).toBe("18446744073709551615");
  });

  it("wraps values beyond 64-bit range", () => {
    const overflowed = (1n << 64n) + 5n;
    const { hex, decimal } = formatRegister(overflowed);
    expect(hex).toBe("0x0000000000000005");
    expect(decimal).toBe("5");
  });
});

describe("formatPc", () => {
  it("zero-pads to at least 4 digits", () => {
    expect(formatPc(0)).toBe("0000");
    expect(formatPc(5)).toBe("0005");
    expect(formatPc(0xff)).toBe("00FF");
  });

  it("expands past 4 digits as needed", () => {
    expect(formatPc(0x10000)).toBe("10000");
    expect(formatPc(0xfffff)).toBe("FFFFF");
  });

  it("handles exact 4-digit boundary", () => {
    expect(formatPc(0xffff)).toBe("FFFF");
  });
});

describe("formatGas", () => {
  it("formats zero", () => {
    expect(formatGas(0n)).toBe("0");
  });

  it("formats small values without commas", () => {
    expect(formatGas(999n)).toBe("999");
  });

  it("formats 1000 with comma", () => {
    expect(formatGas(1000n)).toBe("1,000");
  });

  it("formats one million", () => {
    expect(formatGas(1_000_000n)).toBe("1,000,000");
  });

  it("formats large values", () => {
    expect(formatGas(1234567890n)).toBe("1,234,567,890");
  });
});

describe("bytesToHex", () => {
  it("formats empty array as empty string", () => {
    expect(bytesToHex(new Uint8Array([]))).toBe("");
  });

  it("formats single byte", () => {
    expect(bytesToHex(new Uint8Array([0x00]))).toBe("00");
    expect(bytesToHex(new Uint8Array([0xff]))).toBe("FF");
    expect(bytesToHex(new Uint8Array([0x0a]))).toBe("0A");
  });

  it("formats multiple bytes with spaces", () => {
    expect(bytesToHex(new Uint8Array([0xc8, 0x00, 0x01]))).toBe("C8 00 01");
  });

  it("zero-pads single-digit hex values", () => {
    expect(bytesToHex(new Uint8Array([0x05]))).toBe("05");
  });
});

describe("lifecycleLabel", () => {
  it("maps paused to OK", () => {
    expect(lifecycleLabel("paused", "ok")).toBe("OK");
  });

  it("maps running to Running", () => {
    expect(lifecycleLabel("running")).toBe("Running");
  });

  it("maps paused_host_call to Host Call", () => {
    expect(lifecycleLabel("paused_host_call")).toBe("Host Call");
  });

  it("maps terminated+halt to Halt", () => {
    expect(lifecycleLabel("terminated", "halt")).toBe("Halt");
  });

  it("maps terminated+panic to Panic", () => {
    expect(lifecycleLabel("terminated", "panic")).toBe("Panic");
  });

  it("maps terminated+fault to Fault", () => {
    expect(lifecycleLabel("terminated", "fault")).toBe("Fault");
  });

  it("maps terminated+out_of_gas to Out of Gas", () => {
    expect(lifecycleLabel("terminated", "out_of_gas")).toBe("Out of Gas");
  });

  it("maps failed to Error", () => {
    expect(lifecycleLabel("failed")).toBe("Error");
  });

  it("maps timed_out to Timeout", () => {
    expect(lifecycleLabel("timed_out")).toBe("Timeout");
  });
});

describe("parseBigintInput", () => {
  it("parses decimal strings", () => {
    expect(parseBigintInput("42")).toBe(42n);
    expect(parseBigintInput("0")).toBe(0n);
    expect(parseBigintInput("1000000")).toBe(1000000n);
  });

  it("parses hex strings", () => {
    expect(parseBigintInput("0xff")).toBe(255n);
    expect(parseBigintInput("0xFF")).toBe(255n);
    expect(parseBigintInput("0x0")).toBe(0n);
    expect(parseBigintInput("0x000000000000002a")).toBe(42n);
  });

  it("parses negative decimal", () => {
    expect(parseBigintInput("-1")).toBe(-1n);
  });

  it("rejects empty string", () => {
    expect(parseBigintInput("")).toBeNull();
    expect(parseBigintInput("  ")).toBeNull();
  });

  it("rejects non-numeric strings", () => {
    expect(parseBigintInput("abc")).toBeNull();
    expect(parseBigintInput("0xzz")).toBeNull();
    expect(parseBigintInput("12.5")).toBeNull();
  });

  it("rejects bare hex prefix with no digits", () => {
    expect(parseBigintInput("0x")).toBeNull();
    expect(parseBigintInput("0X")).toBeNull();
  });

  it("rejects hex with mixed invalid chars", () => {
    expect(parseBigintInput("0x1g")).toBeNull();
    expect(parseBigintInput("0x-1")).toBeNull();
  });

  it("trims whitespace", () => {
    expect(parseBigintInput("  42  ")).toBe(42n);
    expect(parseBigintInput(" 0xff ")).toBe(255n);
  });
});

describe("parsePcInput", () => {
  it("parses valid PC values", () => {
    expect(parsePcInput("0")).toBe(0);
    expect(parsePcInput("100")).toBe(100);
    expect(parsePcInput("0x100")).toBe(256);
  });

  it("rejects negative values", () => {
    expect(parsePcInput("-1")).toBeNull();
    expect(parsePcInput("-100")).toBeNull();
  });

  it("rejects invalid input", () => {
    expect(parsePcInput("")).toBeNull();
    expect(parsePcInput("abc")).toBeNull();
  });

  it("rejects values beyond MAX_SAFE_INTEGER", () => {
    expect(parsePcInput("9007199254740992")).toBeNull(); // MAX_SAFE_INTEGER + 1
  });

  it("accepts MAX_SAFE_INTEGER exactly", () => {
    expect(parsePcInput("9007199254740991")).toBe(9007199254740991);
  });
});

describe("formatGasHex", () => {
  it("formats gas as hex", () => {
    expect(formatGasHex(0n)).toBe("0x0");
    expect(formatGasHex(1000000n)).toBe("0xf4240");
    expect(formatGasHex(255n)).toBe("0xff");
  });
});
