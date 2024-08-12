const BUFFER_SIZE = 8;

export class LittleEndianDecoder {
  private buffer = new ArrayBuffer(BUFFER_SIZE);
  private valueArray = new BigUint64Array(this.buffer);
  private view = new DataView(this.buffer);

  decode(bytes: Uint8Array) {
    const n = bytes.length;
    const noOfBytes = Math.min(n, BUFFER_SIZE);

    for (let i = 0; i < noOfBytes; i++) {
      this.view.setUint8(i, bytes[i]);
    }

    for (let i = n; i < BUFFER_SIZE; i++) {
      this.view.setUint8(i, 0x00);
    }

    return this.valueArray[0];
  }
}
