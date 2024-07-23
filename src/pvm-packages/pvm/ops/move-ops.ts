import { BaseOps } from "./base-ops";

export class MoveOps extends BaseOps {
  cmovIfZeroImmediate(firstIndex: number, immediateValue: number, resultIndex: number) {
    if (this.regs.asUnsigned[firstIndex] === 0) {
      this.regs.asUnsigned[resultIndex] = immediateValue;
    }
  }

  cmovIfNotZeroImmediate(firstIndex: number, immediateValue: number, resultIndex: number) {
    if (this.regs.asUnsigned[firstIndex] !== 0) {
      this.regs.asUnsigned[resultIndex] = immediateValue;
    }
  }

  cmovIfZero(firstIndex: number, secondIndex: number, resultIndex: number) {
    this.cmovIfZeroImmediate(firstIndex, this.regs.asUnsigned[secondIndex], resultIndex);
  }

  cmovIfNotZero(firstIndex: number, secondIndex: number, resultIndex: number) {
    this.cmovIfNotZeroImmediate(firstIndex, this.regs.asUnsigned[secondIndex], resultIndex);
  }

  moveRegister(firstIndex: number, resultIndex: number) {
    this.regs.asUnsigned[resultIndex] = this.regs.asUnsigned[firstIndex];
  }
}
