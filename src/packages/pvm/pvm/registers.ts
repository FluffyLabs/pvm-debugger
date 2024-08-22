export const NO_OF_REGISTERS = 13;
const REGISTER_SIZE = 4;

export class Registers {
  private buffer = new ArrayBuffer(NO_OF_REGISTERS * REGISTER_SIZE);
  asSigned = new Int32Array(this.buffer);
  asUnsigned = new Uint32Array(this.buffer);
  private bytes = new Uint8Array(this.buffer);

  getBytesAsLittleEndian(index: number) {
    const offset = index * REGISTER_SIZE;
    return this.bytes.subarray(offset, offset + 4);
  }

  setFromBytes(index: number, bytes: Uint8Array) {
    const offset = index * REGISTER_SIZE;
    for (const [i, byte] of bytes.entries()) {
      this.bytes[offset + i] = byte;
    }
  }
}
