import { describe, it, expect } from "vitest";
import { formatRegister, formatPc, formatGas, lifecycleLabel } from "./value-format";

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
