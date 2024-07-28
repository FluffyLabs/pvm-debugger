import type { Registers } from "../registers";

export class BooleanOps {
  constructor(private regs: Registers) {}

  setLessThanSignedImmediate(firstIndex: number, immediateValue: number, resultIndex: number) {
    this.regs.asUnsigned[resultIndex] = this.regs.asSigned[firstIndex] < immediateValue ? 1 : 0;
  }

  setLessThanUnsignedImmediate(firstIndex: number, immediateValue: number, resultIndex: number) {
    this.regs.asUnsigned[resultIndex] = this.regs.asUnsigned[firstIndex] < immediateValue ? 1 : 0;
  }

  setLessThanSigned(firstIndex: number, secondIndex: number, resultIndex: number) {
    this.setLessThanSignedImmediate(secondIndex, this.regs.asSigned[firstIndex], resultIndex);
  }

  setLessThanUnsigned(firstIndex: number, secondIndex: number, resultIndex: number) {
    this.setLessThanUnsignedImmediate(secondIndex, this.regs.asUnsigned[firstIndex], resultIndex);
  }

  setGreaterThanSignedImmediate(firstIndex: number, immediateValue: number, resultIndex: number) {
    this.regs.asUnsigned[resultIndex] = this.regs.asSigned[firstIndex] > immediateValue ? 1 : 0;
  }

  setGreaterThanUnsignedImmediate(firstIndex: number, immediateValue: number, resultIndex: number) {
    this.regs.asUnsigned[resultIndex] = this.regs.asUnsigned[firstIndex] > immediateValue ? 1 : 0;
  }
}
