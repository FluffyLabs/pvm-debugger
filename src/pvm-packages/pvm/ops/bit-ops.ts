import type { Registers } from "../registers";

export class BitOps {
  constructor(private regs: Registers) {}

  or(firstIndex: number, secondIndex: number, resultIndex: number) {
    this.orImmediate(firstIndex, this.regs.asUnsigned[secondIndex], resultIndex);
  }

  orImmediate(firstIndex: number, immediateValue: number, resultIndex: number) {
    this.regs.asUnsigned[resultIndex] = this.regs.asUnsigned[firstIndex] | immediateValue;
  }

  and(firstIndex: number, secondIndex: number, resultIndex: number) {
    this.andImmediate(firstIndex, this.regs.asUnsigned[secondIndex], resultIndex);
  }

  andImmediate(firstIndex: number, immediateValue: number, resultIndex: number) {
    this.regs.asUnsigned[resultIndex] = this.regs.asUnsigned[firstIndex] & immediateValue;
  }

  xor(firstIndex: number, secondIndex: number, resultIndex: number) {
    this.xorImmediate(firstIndex, this.regs.asUnsigned[secondIndex], resultIndex);
  }

  xorImmediate(firstIndex: number, immediateValue: number, resultIndex: number) {
    this.regs.asUnsigned[resultIndex] = this.regs.asUnsigned[firstIndex] ^ immediateValue;
  }
}
