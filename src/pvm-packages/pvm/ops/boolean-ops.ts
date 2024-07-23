import { BaseOps } from "./base-ops";

export class BooleanOps extends BaseOps {
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
