import type { Registers } from "../registers";

export class LoadOps {
  constructor(private regs: Registers) {}

  loadImmediate(registerIndex: number, immediate: number) {
    this.regs.asUnsigned[registerIndex] = immediate;
  }
}
