/**
 * JAM Codec — variable-length encoding primitives per GP Appendix A/D.
 *
 * VarU64: progressive prefix encoding (1–9 bytes).
 * LE integer primitives: fixed-width little-endian.
 * Container helpers: variable-length blobs and sequences.
 */

// ---------------------------------------------------------------------------
// tryDecode helper
// ---------------------------------------------------------------------------

/** Result of a successful decode. */
export interface DecodeResult<T> {
  value: T;
  bytesRead: number;
}

/**
 * Wrap a decode function so that exceptions become `null`.
 * Avoids repetitive try/catch in every decode call site.
 */
export function tryDecode<T>(
  fn: (bytes: Uint8Array, offset: number) => DecodeResult<T>,
  bytes: Uint8Array,
  offset: number,
): DecodeResult<T> | null {
  try {
    return fn(bytes, offset);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// VarU64
// ---------------------------------------------------------------------------

/**
 * Encode a u64 as VarU64 (GP Appendix A progressive prefix).
 *
 * Uses a generic loop: count how many leading 1-bits the lead byte needs,
 * mask lead byte, write trailing bytes LE.
 *
 * Encoding widths:
 * - 0..127:           1 byte  (lead 0x00..0x7f)
 * - 128..2^14-1:      2 bytes (lead 10xxxxxx)
 * - 2^14..2^21-1:     3 bytes (lead 110xxxxx)
 * - 2^21..2^28-1:     4 bytes (lead 1110xxxx)
 * - 2^28..2^35-1:     5 bytes (lead 11110xxx)
 * - 2^35..2^42-1:     6 bytes (lead 111110xx)
 * - 2^42..2^49-1:     7 bytes (lead 1111110x)
 * - 2^49..2^56-1:     8 bytes (lead 11111110)
 * - 2^56..2^64-1:     9 bytes (lead 11111111)
 */
export function encodeVarU64(v: bigint): Uint8Array {
  if (v < 0n) throw new Error("encodeVarU64: negative value");
  if (v > 0xffff_ffff_ffff_ffffn)
    throw new Error("encodeVarU64: value exceeds u64");

  // Determine width: find smallest n (1..9) such that v < 2^(7*n)
  // For n=1: v < 2^7 = 128
  // For n=2: v < 2^14
  // ...
  // For n=8: v < 2^56
  // n=9: everything else up to 2^64-1
  let n = 1;
  let threshold = 1n << 7n;
  while (n < 9 && v >= threshold) {
    n++;
    threshold = 1n << BigInt(7 * n);
  }

  const result = new Uint8Array(n);

  if (n === 1) {
    // Lead byte IS the value (no prefix bits set)
    result[0] = Number(v);
    return result;
  }

  if (n === 9) {
    // Lead byte is 0xFF, remaining 8 bytes are LE
    result[0] = 0xff;
    let rem = v;
    for (let i = 1; i < 9; i++) {
      result[i] = Number(rem & 0xffn);
      rem >>= 8n;
    }
    return result;
  }

  // n = 2..8
  // Trailing bytes (n-1 bytes, LE) carry the low (n-1)*8 bits
  const trailingBits = BigInt((n - 1) * 8);
  const trailingMask = (1n << trailingBits) - 1n;
  const trailingValue = v & trailingMask;
  const leadPayload = v >> trailingBits;

  // Lead byte: (n-1) leading 1-bits as prefix, then (8-n) payload bits
  // n=2 → 10xxxxxx (0x80), n=3 → 110xxxxx (0xC0), etc.
  const prefix = (0xff << (9 - n)) & 0xff;
  const payloadBits = 8 - n;
  const leadByte = prefix | (Number(leadPayload) & ((1 << payloadBits) - 1));

  result[0] = leadByte;

  // Write trailing bytes LE
  let rem = trailingValue;
  for (let i = 1; i < n; i++) {
    result[i] = Number(rem & 0xffn);
    rem >>= 8n;
  }

  return result;
}

/**
 * Decode a VarU64 from bytes at offset.
 * Returns { value, bytesRead }.
 */
export function decodeVarU64(
  bytes: Uint8Array,
  offset: number = 0,
): DecodeResult<bigint> {
  if (offset >= bytes.length)
    throw new Error("decodeVarU64: offset out of bounds");

  const lead = bytes[offset];

  // Count leading 1-bits to determine total byte count (n)
  let n = 1;
  let mask = 0x80;
  while ((lead & mask) !== 0 && n < 9) {
    n++;
    mask >>= 1;
  }

  if (offset + n > bytes.length) {
    throw new Error(
      `decodeVarU64: not enough bytes (need ${n}, have ${bytes.length - offset})`,
    );
  }

  if (n === 1) {
    return { value: BigInt(lead), bytesRead: 1 };
  }

  if (n === 9) {
    // 8 trailing bytes LE
    let value = 0n;
    for (let i = 8; i >= 1; i--) {
      value = (value << 8n) | BigInt(bytes[offset + i]);
    }
    return { value, bytesRead: 9 };
  }

  // n = 2..8
  // Lead payload: bottom (8 - n) bits
  const payloadBits = 8 - n;
  const leadPayload = BigInt(lead & ((1 << payloadBits) - 1));

  // Trailing bytes: (n-1) bytes LE
  let trailing = 0n;
  for (let i = n - 1; i >= 1; i--) {
    trailing = (trailing << 8n) | BigInt(bytes[offset + i]);
  }

  const trailingBits = BigInt((n - 1) * 8);
  const value = (leadPayload << trailingBits) | trailing;

  return { value, bytesRead: n };
}

// ---------------------------------------------------------------------------
// LE integer primitives
// ---------------------------------------------------------------------------

export function encodeU8(v: number): Uint8Array {
  return new Uint8Array([v & 0xff]);
}

export function decodeU8(
  bytes: Uint8Array,
  offset: number = 0,
): DecodeResult<number> {
  if (offset >= bytes.length) throw new Error("decodeU8: not enough bytes");
  return { value: bytes[offset], bytesRead: 1 };
}

export function encodeU16LE(v: number): Uint8Array {
  const buf = new Uint8Array(2);
  const dv = new DataView(buf.buffer);
  dv.setUint16(0, v, true);
  return buf;
}

export function decodeU16LE(
  bytes: Uint8Array,
  offset: number = 0,
): DecodeResult<number> {
  if (offset + 2 > bytes.length)
    throw new Error("decodeU16LE: not enough bytes");
  const dv = new DataView(bytes.buffer, bytes.byteOffset + offset, 2);
  return { value: dv.getUint16(0, true), bytesRead: 2 };
}

export function encodeU32LE(v: number): Uint8Array {
  const buf = new Uint8Array(4);
  const dv = new DataView(buf.buffer);
  dv.setUint32(0, v, true);
  return buf;
}

export function decodeU32LE(
  bytes: Uint8Array,
  offset: number = 0,
): DecodeResult<number> {
  if (offset + 4 > bytes.length)
    throw new Error("decodeU32LE: not enough bytes");
  const dv = new DataView(bytes.buffer, bytes.byteOffset + offset, 4);
  return { value: dv.getUint32(0, true), bytesRead: 4 };
}

export function encodeU64LE(v: bigint): Uint8Array {
  const buf = new Uint8Array(8);
  const dv = new DataView(buf.buffer);
  dv.setBigUint64(0, v, true);
  return buf;
}

export function decodeU64LE(
  bytes: Uint8Array,
  offset: number = 0,
): DecodeResult<bigint> {
  if (offset + 8 > bytes.length)
    throw new Error("decodeU64LE: not enough bytes");
  const dv = new DataView(bytes.buffer, bytes.byteOffset + offset, 8);
  return { value: dv.getBigUint64(0, true), bytesRead: 8 };
}

// ---------------------------------------------------------------------------
// Fixed-size hash helpers
// ---------------------------------------------------------------------------

export function encodeBytes32(data: Uint8Array): Uint8Array {
  if (data.length !== 32) {
    throw new Error(`encodeBytes32: expected 32 bytes, got ${data.length}`);
  }
  return new Uint8Array(data);
}

export function decodeBytes32(
  bytes: Uint8Array,
  offset: number = 0,
): DecodeResult<Uint8Array> {
  if (offset + 32 > bytes.length)
    throw new Error("decodeBytes32: not enough bytes");
  return { value: bytes.slice(offset, offset + 32), bytesRead: 32 };
}

// ---------------------------------------------------------------------------
// Variable-length containers
// ---------------------------------------------------------------------------

/** Encode a variable-length byte blob: VarU64 length prefix + data. */
export function encodeBytesVarLen(data: Uint8Array): Uint8Array {
  const lenBytes = encodeVarU64(BigInt(data.length));
  const result = new Uint8Array(lenBytes.length + data.length);
  result.set(lenBytes, 0);
  result.set(data, lenBytes.length);
  return result;
}

/** Decode a variable-length byte blob. */
export function decodeBytesVarLen(
  bytes: Uint8Array,
  offset: number = 0,
): DecodeResult<Uint8Array> {
  const lenResult = decodeVarU64(bytes, offset);
  const dataLen = Number(lenResult.value);
  const dataStart = offset + lenResult.bytesRead;
  if (dataStart + dataLen > bytes.length) {
    throw new Error("decodeBytesVarLen: not enough bytes for data");
  }
  return {
    value: bytes.slice(dataStart, dataStart + dataLen),
    bytesRead: lenResult.bytesRead + dataLen,
  };
}

/**
 * Encode a variable-length sequence: VarU64 count + items.
 * Uses a callback to encode each item, avoiding intermediate allocation.
 */
export function encodeSequenceVarLen<T>(
  items: T[],
  encodeFn: (item: T) => Uint8Array,
): Uint8Array {
  const countBytes = encodeVarU64(BigInt(items.length));
  const encodedItems = items.map(encodeFn);
  const totalItemBytes = encodedItems.reduce((sum, b) => sum + b.length, 0);

  const result = new Uint8Array(countBytes.length + totalItemBytes);
  result.set(countBytes, 0);
  let pos = countBytes.length;
  for (const item of encodedItems) {
    result.set(item, pos);
    pos += item.length;
  }
  return result;
}

/**
 * Decode a variable-length sequence.
 * Uses a callback to decode each item from a position.
 */
export function decodeSequenceVarLen<T>(
  bytes: Uint8Array,
  offset: number,
  decodeFn: (bytes: Uint8Array, offset: number) => DecodeResult<T>,
): DecodeResult<T[]> {
  const countResult = decodeVarU64(bytes, offset);
  const count = Number(countResult.value);
  let pos = offset + countResult.bytesRead;
  const items: T[] = [];

  for (let i = 0; i < count; i++) {
    const itemResult = decodeFn(bytes, pos);
    items.push(itemResult.value);
    pos += itemResult.bytesRead;
  }

  return { value: items, bytesRead: pos - offset };
}
