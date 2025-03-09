const BUFFER_SIZE = 8;
const IMMEDIATE_SIZE = 4;
const U32_INDEX = 0;
const U64_INDEX = 0;

export class ImmediateDecoder {
  private u32: Uint32Array;
  private i32: Int32Array;
  private u64: BigUint64Array;
  private i64: BigInt64Array;
  private view: DataView;
  private bytes: Uint8Array;

  constructor() {
    const buffer = new ArrayBuffer(BUFFER_SIZE);
    this.u32 = new Uint32Array(buffer);
    this.i32 = new Int32Array(buffer);
    this.u64 = new BigUint64Array(buffer);
    this.i64 = new BigInt64Array(buffer);
    this.view = new DataView(buffer);
    this.bytes = new Uint8Array(buffer);
  }

  setBytes(bytes: Uint8Array) {
    const n = bytes.length;
    const msb = n > 0 ? bytes[n - 1] & 0x80 : 0;
    const noOfBytes = Math.min(n, BUFFER_SIZE);
    const prefix = msb !== 0 ? 0xff : 0x00;

    for (let i = 0; i < noOfBytes; i++) {
      this.view.setUint8(i, bytes[i]);
    }

    for (let i = n; i < BUFFER_SIZE; i++) {
      this.view.setUint8(i, prefix);
    }
  }

  /**
   * @deprecated Use getU32 instead
   */
  getUnsigned() {
    return this.u32[U32_INDEX];
  }

  /**
   * @deprecated Use getI32 instead
   */
  getSigned() {
    return this.i32[U32_INDEX];
  }

  getU32(): number {
    return this.u32[U32_INDEX];
  }

  getI32(): number {
    return this.i32[U32_INDEX];
  }

  getU64(): bigint {
    return this.u64[U64_INDEX];
  }

  getI64(): bigint {
    return this.i64[U64_INDEX];
  }

  getBytesAsLittleEndian() {
    return this.bytes.subarray(0, IMMEDIATE_SIZE);
  }

  getExtendedBytesAsLittleEndian() {
    return this.bytes;
  }
}
