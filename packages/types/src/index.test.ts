import { describe, it, expect } from "vitest";
import {
  PVM_STATUSES,
  TERMINAL_LIFECYCLES,
  isTerminal,
  toHex,
  fromHex,
  bigintToDecStr,
  decStrToBigint,
  encodeVarU32,
  decodeVarU32,
  regsToUint8,
  uint8ToRegs,
} from "./index.js";
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

describe("toHex / fromHex", () => {
  it("roundtrips empty bytes", () => {
    const empty = new Uint8Array(0);
    expect(fromHex(toHex(empty))).toEqual(empty);
    expect(toHex(empty)).toBe("0x");
  });

  it("roundtrips a single byte", () => {
    const single = new Uint8Array([0xab]);
    const hex = toHex(single);
    expect(hex).toBe("0xab");
    expect(fromHex(hex)).toEqual(single);
  });

  it("roundtrips multi-kilobyte payloads", () => {
    const large = new Uint8Array(4096);
    for (let i = 0; i < large.length; i++) {
      large[i] = i & 0xff;
    }
    const hex = toHex(large);
    const decoded = fromHex(hex);
    expect(decoded).toEqual(large);
  });

  it("fromHex accepts raw hex without 0x prefix", () => {
    expect(fromHex("deadbeef")).toEqual(new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  });

  it("fromHex accepts uppercase hex", () => {
    expect(fromHex("0xDEAD")).toEqual(new Uint8Array([0xde, 0xad]));
  });

  it("fromHex rejects non-hex characters", () => {
    expect(() => fromHex("0xGG")).toThrow("non-hex characters");
  });

  it("fromHex rejects odd-length strings", () => {
    expect(() => fromHex("0xabc")).toThrow("odd length");
  });

  it("fromHex handles empty 0x prefix", () => {
    expect(fromHex("0x")).toEqual(new Uint8Array(0));
  });
});

describe("bigintToDecStr / decStrToBigint", () => {
  it("roundtrips 0", () => {
    expect(decStrToBigint(bigintToDecStr(0n))).toBe(0n);
  });

  it("roundtrips 1", () => {
    expect(decStrToBigint(bigintToDecStr(1n))).toBe(1n);
  });

  it("roundtrips 2^64 - 1", () => {
    const val = (1n << 64n) - 1n;
    expect(decStrToBigint(bigintToDecStr(val))).toBe(val);
  });

  it("decStrToBigint rejects non-decimal strings", () => {
    expect(() => decStrToBigint("abc")).toThrow("Invalid decimal string");
    expect(() => decStrToBigint("12.5")).toThrow("Invalid decimal string");
    expect(() => decStrToBigint("0x10")).toThrow("Invalid decimal string");
  });
});

describe("encodeVarU32 / decodeVarU32", () => {
  const testCases: [number, number][] = [
    [0, 1],
    [127, 1],
    [128, 2],
    [145, 2],
    [16383, 2],
    [16384, 3],
    [2097151, 3],
    [2097152, 4],
    [268435455, 4],
    [268435456, 5],
    [4294967295, 5],
  ];

  for (const [value, expectedBytes] of testCases) {
    it(`roundtrips ${value} (${expectedBytes} byte${expectedBytes > 1 ? "s" : ""})`, () => {
      const encoded = encodeVarU32(value);
      expect(encoded.length).toBe(expectedBytes);
      const decoded = decodeVarU32(encoded);
      expect(decoded.value).toBe(value);
      expect(decoded.bytesRead).toBe(expectedBytes);
    });
  }

  it("encodeVarU32(0x1fffffff) yields a lead byte of 0xf1", () => {
    const encoded = encodeVarU32(0x1fffffff);
    expect(encoded[0]).toBe(0xf1);
  });

  it("encodeVarU32(0xffffffff) yields a lead byte of 0xf7", () => {
    const encoded = encodeVarU32(0xffffffff);
    expect(encoded[0]).toBe(0xf7);
  });

  it("decodeVarU32(encodeVarU32(0xffffffff)).value is 4294967295, not -1", () => {
    const encoded = encodeVarU32(0xffffffff);
    const decoded = decodeVarU32(encoded);
    expect(decoded.value).toBe(4294967295);
    expect(decoded.value).not.toBe(-1);
  });

  it("encodeVarU32(NaN) throws", () => {
    expect(() => encodeVarU32(NaN)).toThrow("NaN");
  });

  it("encodeVarU32(1.5) throws", () => {
    expect(() => encodeVarU32(1.5)).toThrow("not an integer");
  });

  it("encodeVarU32(-1) throws", () => {
    expect(() => encodeVarU32(-1)).toThrow("out of range");
  });

  it("encodeVarU32(0x100000000) throws", () => {
    expect(() => encodeVarU32(0x100000000)).toThrow("out of range");
  });

  it("decodes from an offset within a larger buffer", () => {
    const prefix = new Uint8Array([0xff, 0xfe]);
    const encoded = encodeVarU32(12345);
    const combined = new Uint8Array(prefix.length + encoded.length);
    combined.set(prefix);
    combined.set(encoded, prefix.length);
    const decoded = decodeVarU32(combined, prefix.length);
    expect(decoded.value).toBe(12345);
  });
});

describe("regsToUint8 / uint8ToRegs", () => {
  it("roundtrips all-zero registers", () => {
    const regs = Array.from({ length: 13 }, () => 0n);
    const bytes = regsToUint8(regs);
    expect(bytes.length).toBe(104);
    expect(uint8ToRegs(bytes)).toEqual(regs);
  });

  it("roundtrips mixed register values including 0xffffffffffffffff", () => {
    const regs = [
      0n,
      1n,
      0xffffffffffffffffn,
      42n,
      0x123456789abcdef0n,
      0n,
      0n,
      0n,
      0n,
      0n,
      0n,
      0n,
      0xdeadbeefcafebaben,
    ];
    const bytes = regsToUint8(regs);
    const decoded = uint8ToRegs(bytes);
    expect(decoded).toEqual(regs);
  });

  it("regsToUint8 rejects wrong register count", () => {
    expect(() => regsToUint8([0n, 1n])).toThrow("expected 13 registers");
  });

  it("uint8ToRegs rejects wrong byte length", () => {
    expect(() => uint8ToRegs(new Uint8Array(50))).toThrow("expected 104 bytes");
  });

  it("uses little-endian byte order", () => {
    const regs = Array.from({ length: 13 }, () => 0n);
    regs[0] = 0x0102030405060708n;
    const bytes = regsToUint8(regs);
    // Little-endian: least significant byte first
    expect(bytes[0]).toBe(0x08);
    expect(bytes[1]).toBe(0x07);
    expect(bytes[2]).toBe(0x06);
    expect(bytes[3]).toBe(0x05);
    expect(bytes[4]).toBe(0x04);
    expect(bytes[5]).toBe(0x03);
    expect(bytes[6]).toBe(0x02);
    expect(bytes[7]).toBe(0x01);
  });
});
