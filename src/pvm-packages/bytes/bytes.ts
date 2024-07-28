import { check } from "@typeberry/utils";

function bytesToHexString(buffer: Uint8Array): string {
  // TODO [ToDr] consider using TextDecoder API?
  let s = "0x";
  for (const v of buffer) {
    s += v.toString(16).padStart(2, "0");
  }
  return s;
}

export class BytesBlob {
  readonly buffer: Uint8Array = new Uint8Array([]);
  readonly length: number = 0;

  constructor(data: Uint8Array) {
    this.buffer = data;
    this.length = data.byteLength;
  }

  toString() {
    return bytesToHexString(this.buffer);
  }

  static fromBytes(v: number[]): BytesBlob {
    const arr = new Uint8Array(v);
    return new BytesBlob(arr);
  }

  static parseBlobNoPrefix(v: string): BytesBlob {
    const len = v.length;
    if (len % 2 === 1) {
      throw new Error(`Odd number of nibbles. Invalid hex string: ${v}.`);
    }
    // NOTE [ToDr] alloc
    const buffer = new ArrayBuffer(len / 2);
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < len - 1; i += 2) {
      const c = v.substring(i, i + 2);
      // TODO [ToDr] [opti] Remove string concat and simply parse each nibble manually
      // (switch from 0..f)
      const parsed = Number(`0x${c}`);
      if (Number.isNaN(parsed)) {
        throw new Error(`Invalid characters in hex byte string: ${c}`);
      }
      bytes[i / 2] = parsed;
    }

    return new BytesBlob(bytes);
  }

  static parseBlob(v: string): BytesBlob {
    if (!v.startsWith("0x")) {
      throw new Error(`Missing 0x prefix: ${v}.`);
    }
    return BytesBlob.parseBlobNoPrefix(v.substring(2));
  }
}

export class Bytes<T extends number> {
  readonly raw: Uint8Array;
  readonly length: T;

  constructor(raw: Uint8Array, len: T) {
    check(raw.byteLength === len, `Given buffer has incorrect size ${raw.byteLength} vs expected ${len}`);
    this.raw = raw;
    this.length = len;
  }

  toString() {
    return bytesToHexString(this.raw);
  }

  isEqualTo(other: Bytes<T>): boolean {
    if (this.length !== other.length) {
      return false;
    }

    for (let i = 0; i < this.length; i++) {
      if (this.raw[i] !== other.raw[i]) {
        return false;
      }
    }
    return true;
  }

  static zero<X extends number>(len: X): Bytes<X> {
    return new Bytes(new Uint8Array(len), len);
  }

  static parseBytesNoPrefix<X extends number>(v: string, len: X): Bytes<X> {
    if (v.length > 2 * len) {
      throw new Error(`Input string too long. Expected ${len}, got ${v.length / 2}`);
    }

    const blob = BytesBlob.parseBlobNoPrefix(v);
    return new Bytes(blob.buffer, len);
  }

  static parseBytes<X extends number>(v: string, len: X): Bytes<X> {
    if (v.length > 2 * len + 2) {
      throw new Error(`Input string too long. Expected ${len}, got ${v.length / 2 - 1}`);
    }

    const blob = BytesBlob.parseBlob(v);
    return new Bytes(blob.buffer, len);
  }
}
