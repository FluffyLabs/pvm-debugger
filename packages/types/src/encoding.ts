const HEX_CHARS = "0123456789abcdef";

/** Convert a Uint8Array to a hex string (with 0x prefix). */
export function toHex(bytes: Uint8Array): string {
  let result = "0x";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    result += HEX_CHARS[b >> 4] + HEX_CHARS[b & 0x0f];
  }
  return result;
}

/** Convert a hex string to a Uint8Array. Accepts with or without 0x prefix. */
export function fromHex(hex: string): Uint8Array {
  let str = hex;
  if (str.startsWith("0x") || str.startsWith("0X")) {
    str = str.slice(2);
  }
  if (str.length % 2 !== 0) {
    throw new Error(`Invalid hex string: odd length (${str.length})`);
  }
  if (str.length > 0 && !/^[0-9a-fA-F]+$/.test(str)) {
    throw new Error("Invalid hex string: contains non-hex characters");
  }
  const bytes = new Uint8Array(str.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(str.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/** Convert a bigint to a decimal string. */
export function bigintToDecStr(value: bigint): string {
  return value.toString(10);
}

/** Convert a decimal string to a bigint. Rejects non-decimal strings. */
export function decStrToBigint(str: string): bigint {
  if (!/^-?[0-9]+$/.test(str)) {
    throw new Error(`Invalid decimal string: "${str}"`);
  }
  return BigInt(str);
}

/**
 * Encode a number as VarU32.
 *
 * Encoding classes:
 * - 0x00..0x7f: 1 byte
 * - 0x80..0x3fff: 2 bytes (lead 0x80..0xbf)
 * - 0x4000..0x1fffff: 3 bytes (lead 0xc0..0xdf)
 * - 0x200000..0xfffffff: 4 bytes (lead 0xe0..0xef)
 * - 0x10000000..0xffffffff: 5 bytes (lead 0xf0..0xf7)
 */
export function encodeVarU32(v: number): Uint8Array {
  if (Number.isNaN(v)) {
    throw new Error("encodeVarU32: value is NaN");
  }
  if (!Number.isInteger(v)) {
    throw new Error(`encodeVarU32: value is not an integer (${v})`);
  }
  if (v < 0 || v > 0xffffffff) {
    throw new Error(`encodeVarU32: value out of range (${v})`);
  }

  if (v <= 0x7f) {
    return new Uint8Array([v]);
  }
  if (v <= 0x3fff) {
    return new Uint8Array([0x80 | (v >> 8), v & 0xff]);
  }
  if (v <= 0x1fffff) {
    return new Uint8Array([0xc0 | (v >> 16), v & 0xff, (v >> 8) & 0xff]);
  }
  if (v <= 0x0fffffff) {
    return new Uint8Array([0xe0 | (v >> 24), v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff]);
  }
  // 5-byte encoding
  const leadByte = 0xf0 | ((v >>> 28) & 0x07);
  return new Uint8Array([leadByte, v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff]);
}

/**
 * Decode a VarU32 from bytes at the given offset.
 * Returns the decoded value and number of bytes consumed.
 */
export function decodeVarU32(bytes: Uint8Array, offset: number = 0): { value: number; bytesRead: number } {
  if (offset >= bytes.length) {
    throw new Error("decodeVarU32: offset out of bounds");
  }
  const lead = bytes[offset];

  if (lead <= 0x7f) {
    return { value: lead, bytesRead: 1 };
  }
  if (lead <= 0xbf) {
    if (offset + 1 >= bytes.length) throw new Error("decodeVarU32: not enough bytes for 2-byte encoding");
    const value = ((lead & 0x3f) << 8) | bytes[offset + 1];
    return { value, bytesRead: 2 };
  }
  if (lead <= 0xdf) {
    if (offset + 2 >= bytes.length) throw new Error("decodeVarU32: not enough bytes for 3-byte encoding");
    const value = ((lead & 0x1f) << 16) | (bytes[offset + 2] << 8) | bytes[offset + 1];
    return { value, bytesRead: 3 };
  }
  if (lead <= 0xef) {
    if (offset + 3 >= bytes.length) throw new Error("decodeVarU32: not enough bytes for 4-byte encoding");
    const value = ((lead & 0x0f) << 24) | (bytes[offset + 3] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 1];
    return { value, bytesRead: 4 };
  }
  // 5-byte encoding: lead 0xf0..0xf7
  if (lead <= 0xf7) {
    if (offset + 4 >= bytes.length) throw new Error("decodeVarU32: not enough bytes for 5-byte encoding");
    // Use unsigned right shift (>>>) to coerce to unsigned 32-bit
    const value =
      ((bytes[offset + 4] << 24) | (bytes[offset + 3] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 1]) >>> 0;
    return { value, bytesRead: 5 };
  }
  throw new Error(`decodeVarU32: invalid lead byte 0x${lead.toString(16)}`);
}

/**
 * Encode raw PVM instruction bytes into a proper PVM program blob.
 *
 * PVM blob format:
 * 1. jumpTableLength (varU32) - number of jump table entries
 * 2. jumpTableItemLength (u8) - bytes per entry
 * 3. codeLength (varU32) - length of code section
 * 4. jumpTable data
 * 5. code bytes
 * 6. mask (bitVecFixLen(codeLength)) - instruction boundary mask
 *
 * **Important:** Generic PVM programs and JSON test vectors contain raw
 * instruction bytes. They MUST be wrapped in a PVM blob before passing to
 * adapters like typeberry, which expect the blob format.
 *
 * @param code - Raw instruction bytes
 * @param instructionStarts - Array of byte offsets that are instruction starts.
 *   If omitted, only byte 0 is marked as an instruction start.
 */
export function encodePvmBlob(
  code: Uint8Array,
  instructionStarts?: number[],
): Uint8Array {
  const codeLength = code.length;
  const maskByteLength = Math.ceil(codeLength / 8);

  const mask = new Uint8Array(maskByteLength);
  const starts = instructionStarts ?? [0];
  for (const start of starts) {
    if (start < codeLength) {
      mask[Math.floor(start / 8)] |= 1 << (start % 8);
    }
  }

  const jtLenBytes = encodeVarU32(0);
  const jtItemLenByte = new Uint8Array([0]);
  const codeLenBytes = encodeVarU32(codeLength);

  const totalLength = jtLenBytes.length + jtItemLenByte.length + codeLenBytes.length + codeLength + maskByteLength;
  const blob = new Uint8Array(totalLength);
  let offset = 0;

  blob.set(jtLenBytes, offset); offset += jtLenBytes.length;
  blob.set(jtItemLenByte, offset); offset += jtItemLenByte.length;
  blob.set(codeLenBytes, offset); offset += codeLenBytes.length;
  blob.set(code, offset); offset += codeLength;
  blob.set(mask, offset);

  return blob;
}

const REGISTER_COUNT = 13;
const BYTES_PER_REGISTER = 8;
const TOTAL_REGISTER_BYTES = REGISTER_COUNT * BYTES_PER_REGISTER; // 104

/** Convert 13 bigint registers to a 104-byte Uint8Array (little-endian). */
export function regsToUint8(regs: bigint[]): Uint8Array {
  if (regs.length !== REGISTER_COUNT) {
    throw new Error(`regsToUint8: expected ${REGISTER_COUNT} registers, got ${regs.length}`);
  }
  const buffer = new ArrayBuffer(TOTAL_REGISTER_BYTES);
  const view = new DataView(buffer);
  for (let i = 0; i < REGISTER_COUNT; i++) {
    view.setBigUint64(i * BYTES_PER_REGISTER, regs[i], true);
  }
  return new Uint8Array(buffer);
}

/** Convert a 104-byte Uint8Array to 13 bigint registers (little-endian). */
export function uint8ToRegs(bytes: Uint8Array): bigint[] {
  if (bytes.length !== TOTAL_REGISTER_BYTES) {
    throw new Error(`uint8ToRegs: expected ${TOTAL_REGISTER_BYTES} bytes, got ${bytes.length}`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const regs: bigint[] = [];
  for (let i = 0; i < REGISTER_COUNT; i++) {
    regs.push(view.getBigUint64(i * BYTES_PER_REGISTER, true));
  }
  return regs;
}
