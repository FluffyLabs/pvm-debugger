const BUFFER_SIZE = 8;

export class LittleEndianDecoder {
  private buffer = new ArrayBuffer(BUFFER_SIZE);
  private u64ValueArray = new BigUint64Array(this.buffer);
  private u32ValueArray = new Uint32Array(this.buffer);
  private view = new DataView(this.buffer);

  private loadBytes(bytes: Uint8Array) {
    const n = bytes.length;
    const noOfBytes = Math.min(n, BUFFER_SIZE);

    for (let i = 0; i < noOfBytes; i++) {
      this.view.setUint8(i, bytes[i]);
    }

    for (let i = n; i < BUFFER_SIZE; i++) {
      this.view.setUint8(i, 0x00);
    }
  }

  decodeU64(bytes: Uint8Array) {
    this.loadBytes(bytes);
    return this.u64ValueArray[0];
  }

  decodeU32(bytes: Uint8Array) {
    this.loadBytes(bytes);
    return this.u32ValueArray[0];
  }
}
