export const NO_OF_REGISTERS = 13;
const REGISTER_SIZE = 4;

export class Registers {
  private buffer = new ArrayBuffer(NO_OF_REGISTERS * REGISTER_SIZE);
  asSigned = new Int32Array(this.buffer);
  asUnsigned = new Uint32Array(this.buffer);
}
