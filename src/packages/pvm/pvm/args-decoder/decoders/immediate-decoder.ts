const IMMEDIATE_SIZE = 4;

export class ImmediateDecoder {
  public buffer = new ArrayBuffer(IMMEDIATE_SIZE);
  public unsignedImmediate = new Uint32Array(this.buffer);
  public signedImmediate = new Int32Array(this.buffer);
  public view = new DataView(this.buffer);
  public bytes = new Uint8Array(this.buffer);

  setBytes(bytes: Uint8Array) {
    const n = bytes.length;
    const msb = n > 0 ? bytes[n - 1] & 0x80 : 0;
    const noOfBytes = Math.min(n, IMMEDIATE_SIZE);
    const prefix = msb !== 0 ? 0xff : 0x00;

    for (let i = 0; i < noOfBytes; i++) {
      this.view.setUint8(i, bytes[i]);
    }

    for (let i = n; i < IMMEDIATE_SIZE; i++) {
      this.view.setUint8(i, prefix);
    }
  }

  getUnsigned() {
    return this.unsignedImmediate[0];
  }

  getSigned() {
    return this.signedImmediate[0];
  }

  getBytesAsLittleEndian() {
    return this.bytes.subarray(0, IMMEDIATE_SIZE);
  }
}
