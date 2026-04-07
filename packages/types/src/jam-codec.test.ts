import { describe, expect, it } from "vitest";
import {
  decodeBytes32,
  decodeBytesVarLen,
  decodeSequenceVarLen,
  decodeU8,
  decodeU16LE,
  decodeU32LE,
  decodeU64LE,
  decodeVarU64,
  encodeBytes32,
  encodeBytesVarLen,
  encodeSequenceVarLen,
  encodeU8,
  encodeU16LE,
  encodeU32LE,
  encodeU64LE,
  encodeVarU64,
  tryDecode,
} from "./jam-codec.js";

describe("VarU64 encode/decode", () => {
  const boundaryTests: [bigint, number][] = [
    [0n, 1], // min 1-byte
    [127n, 1], // max 1-byte
    [128n, 2], // min 2-byte
    [0x3fffn, 2], // max 2-byte (2^14-1)
    [0x4000n, 3], // min 3-byte (2^14)
    [0x1fffffn, 3], // max 3-byte (2^21-1)
    [0x200000n, 4], // min 4-byte (2^21)
    [0xfffffffn, 4], // max 4-byte (2^28-1)
    [0x10000000n, 5], // min 5-byte (2^28)
    [0x7ffffffffn, 5], // max 5-byte (2^35-1)
    [0x800000000n, 6], // min 6-byte (2^35)
    [0x3ffffffffffn, 6], // max 6-byte (2^42-1)
    [0x40000000000n, 7], // min 7-byte (2^42)
    [0x1ffffffffffffn, 7], // max 7-byte (2^49-1)
    [0x200000000000n, 7], // within 7-byte (2^45 — not a boundary but exercises 7-byte path)
    [0x2000000000000n, 8], // min 8-byte (2^49)
    [0xffffffffffffffn, 8], // max 8-byte (2^56-1)
    [0x100000000000000n, 9], // min 9-byte (2^56)
    [1n << 63n, 9], // 2^63
    [(1n << 64n) - 1n, 9], // max u64
  ];

  for (const [value, expectedBytes] of boundaryTests) {
    it(`roundtrips ${value} (${expectedBytes} byte${expectedBytes > 1 ? "s" : ""})`, () => {
      const encoded = encodeVarU64(value);
      expect(encoded.length).toBe(expectedBytes);
      const decoded = decodeVarU64(encoded);
      expect(decoded.value).toBe(value);
      expect(decoded.bytesRead).toBe(expectedBytes);
    });
  }

  it("encodes 0 as a single zero byte", () => {
    expect(Array.from(encodeVarU64(0n))).toEqual([0]);
  });

  it("encodes 127 as 0x7F", () => {
    expect(Array.from(encodeVarU64(127n))).toEqual([0x7f]);
  });

  it("encodes 128 with lead byte having top bit set", () => {
    const enc = encodeVarU64(128n);
    expect(enc.length).toBe(2);
    expect(enc[0] & 0x80).toBe(0x80);
  });

  it("9-byte encoding has lead byte 0xFF", () => {
    const enc = encodeVarU64(1n << 56n);
    expect(enc[0]).toBe(0xff);
  });

  it("rejects negative values", () => {
    expect(() => encodeVarU64(-1n)).toThrow("negative");
  });

  it("rejects values > 2^64-1", () => {
    expect(() => encodeVarU64(1n << 64n)).toThrow("exceeds u64");
  });

  it("decodes from offset within larger buffer", () => {
    const prefix = new Uint8Array([0xaa, 0xbb]);
    const encoded = encodeVarU64(12345n);
    const combined = new Uint8Array(prefix.length + encoded.length);
    combined.set(prefix);
    combined.set(encoded, prefix.length);
    const decoded = decodeVarU64(combined, prefix.length);
    expect(decoded.value).toBe(12345n);
  });

  it("decodeVarU64 throws on empty buffer", () => {
    expect(() => decodeVarU64(new Uint8Array(0))).toThrow("out of bounds");
  });

  it("decodeVarU64 throws on truncated data", () => {
    expect(() => decodeVarU64(new Uint8Array([0x80]))).toThrow(
      "not enough bytes",
    );
  });

  // Specifically test the 6-byte encoding lead byte payload bits (pitfall #1)
  it("correctly roundtrips 2^32 (tests 5-byte boundary)", () => {
    const v = 1n << 32n;
    const enc = encodeVarU64(v);
    expect(enc.length).toBe(5);
    const dec = decodeVarU64(enc);
    expect(dec.value).toBe(v);
  });

  it("correctly roundtrips 2^40 (tests 6-byte boundary)", () => {
    const v = 1n << 40n;
    const enc = encodeVarU64(v);
    expect(enc.length).toBe(6);
    const dec = decodeVarU64(enc);
    expect(dec.value).toBe(v);
  });

  it("correctly roundtrips 2^48 (tests 7-byte boundary)", () => {
    const v = 1n << 48n;
    const enc = encodeVarU64(v);
    expect(enc.length).toBe(7);
    const dec = decodeVarU64(enc);
    expect(dec.value).toBe(v);
  });
});

describe("LE integer primitives", () => {
  it("encodeU8 / decodeU8 roundtrips", () => {
    for (const v of [0, 1, 127, 255]) {
      const enc = encodeU8(v);
      expect(enc.length).toBe(1);
      expect(decodeU8(enc).value).toBe(v);
    }
  });

  it("encodeU16LE / decodeU16LE roundtrips", () => {
    for (const v of [0, 1, 0x1234, 0xffff]) {
      const enc = encodeU16LE(v);
      expect(enc.length).toBe(2);
      expect(decodeU16LE(enc).value).toBe(v);
    }
  });

  it("U16LE is little-endian", () => {
    const enc = encodeU16LE(0x0102);
    expect(enc[0]).toBe(0x02); // low byte first
    expect(enc[1]).toBe(0x01);
  });

  it("encodeU32LE / decodeU32LE roundtrips", () => {
    for (const v of [0, 1, 0x12345678, 0xffffffff]) {
      const enc = encodeU32LE(v);
      expect(enc.length).toBe(4);
      expect(decodeU32LE(enc).value).toBe(v);
    }
  });

  it("encodeU64LE / decodeU64LE roundtrips", () => {
    for (const v of [0n, 1n, 0x123456789abcdef0n, 0xffffffffffffffffn]) {
      const enc = encodeU64LE(v);
      expect(enc.length).toBe(8);
      expect(decodeU64LE(enc).value).toBe(v);
    }
  });

  it("decodeU16LE works with subarray (non-zero byteOffset)", () => {
    const buf = new Uint8Array([0xff, 0x34, 0x12]);
    const sub = buf.subarray(1, 3);
    expect(sub.byteOffset).toBe(1);
    expect(decodeU16LE(sub).value).toBe(0x1234);
  });

  it("decodeU32LE works with subarray (non-zero byteOffset)", () => {
    const buf = new Uint8Array([0xff, 0x78, 0x56, 0x34, 0x12]);
    const sub = buf.subarray(1, 5);
    expect(sub.byteOffset).toBe(1);
    expect(decodeU32LE(sub).value).toBe(0x12345678);
  });

  it("decodeU64LE works with subarray (non-zero byteOffset)", () => {
    const enc = encodeU64LE(0xdeadbeefcafebaben);
    const padded = new Uint8Array(4 + enc.length);
    padded.set(enc, 4);
    const sub = padded.subarray(4, 4 + enc.length);
    expect(sub.byteOffset).toBe(4);
    expect(decodeU64LE(sub).value).toBe(0xdeadbeefcafebaben);
  });
});

describe("encodeBytes32 / decodeBytes32", () => {
  it("roundtrips 32 zero bytes", () => {
    const data = new Uint8Array(32);
    const encoded = encodeBytes32(data);
    expect(encoded.length).toBe(32);
    const decoded = decodeBytes32(encoded);
    expect(decoded.value).toEqual(data);
    expect(decoded.bytesRead).toBe(32);
  });

  it("rejects non-32-byte input", () => {
    expect(() => encodeBytes32(new Uint8Array(31))).toThrow(
      "expected 32 bytes",
    );
    expect(() => encodeBytes32(new Uint8Array(33))).toThrow(
      "expected 32 bytes",
    );
  });
});

describe("encodeBytesVarLen / decodeBytesVarLen", () => {
  it("roundtrips empty bytes", () => {
    const enc = encodeBytesVarLen(new Uint8Array(0));
    const dec = decodeBytesVarLen(enc);
    expect(dec.value.length).toBe(0);
  });

  it("roundtrips non-empty bytes", () => {
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    const enc = encodeBytesVarLen(data);
    const dec = decodeBytesVarLen(enc);
    expect(Array.from(dec.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it("length prefix is VarU64", () => {
    // 200 bytes → VarU64(200) needs 2 bytes, so total = 2 + 200 = 202
    const data = new Uint8Array(200);
    const enc = encodeBytesVarLen(data);
    expect(enc.length).toBe(202);
  });
});

describe("encodeSequenceVarLen / decodeSequenceVarLen", () => {
  it("roundtrips empty sequence", () => {
    const enc = encodeSequenceVarLen<number>([], () => new Uint8Array(0));
    const dec = decodeSequenceVarLen(enc, 0, (bytes, off) => {
      return { value: 0, bytesRead: 0 };
    });
    expect(dec.value).toEqual([]);
  });

  it("roundtrips sequence of u32 values", () => {
    const items = [100, 200, 300];
    const enc = encodeSequenceVarLen(items, (v) => encodeU32LE(v));
    const dec = decodeSequenceVarLen(enc, 0, (bytes, off) =>
      decodeU32LE(bytes, off),
    );
    expect(dec.value).toEqual([100, 200, 300]);
  });

  it("roundtrips mixed-size items (var-len blobs)", () => {
    const blobs = [new Uint8Array([1, 2]), new Uint8Array([3, 4, 5, 6])];
    const enc = encodeSequenceVarLen(blobs, (b) => encodeBytesVarLen(b));
    const dec = decodeSequenceVarLen(enc, 0, (bytes, off) =>
      decodeBytesVarLen(bytes, off),
    );
    expect(dec.value.length).toBe(2);
    expect(Array.from(dec.value[0])).toEqual([1, 2]);
    expect(Array.from(dec.value[1])).toEqual([3, 4, 5, 6]);
  });
});

describe("tryDecode", () => {
  it("returns result on success", () => {
    const result = tryDecode(decodeU8, new Uint8Array([42]), 0);
    expect(result).toEqual({ value: 42, bytesRead: 1 });
  });

  it("returns null on failure", () => {
    const result = tryDecode(decodeU8, new Uint8Array(0), 0);
    expect(result).toBeNull();
  });
});
