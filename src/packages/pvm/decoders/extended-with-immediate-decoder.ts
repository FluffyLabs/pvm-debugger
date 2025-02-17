const IMMEDIATE_SIZE = 8;

export class ExtendedWitdthImmediateDecoder {
  private unsignedImmediate: BigUint64Array;
  private bytes: Uint8Array;

  constructor() {
    const buffer = new ArrayBuffer(IMMEDIATE_SIZE);
    this.unsignedImmediate = new BigUint64Array(buffer);
    this.bytes = new Uint8Array(buffer);
  }

  setBytes(bytes: Uint8Array) {
    let i = 0;
    for (; i < bytes.length; i++) {
      this.bytes[i] = bytes[i];
    }

    for (; i < IMMEDIATE_SIZE; i++) {
      this.bytes[i] = 0;
    }
  }

  getValue() {
    return this.unsignedImmediate[0];
  }

  getBytesAsLittleEndian() {
    return this.bytes.subarray(0, IMMEDIATE_SIZE);
  }
}
