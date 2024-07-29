import type { InstructionResult } from "../instruction-result";
import type { Registers } from "../registers";

export class BranchOps {
  constructor(
    private regs: Registers,
    private instructionResult: InstructionResult,
  ) {}

  private branch(offset: number, condition: boolean) {
    if (!condition) {
      return;
    }
    // TODO [MaSi]: incorrect offset should be handled here
    this.instructionResult.pcOffset = offset;
  }

  jump(offset: number) {
    this.branch(offset, true);
  }

  loadImmediateJump(registerIndex: number, immediate: number, offset: number) {
    this.regs.asUnsigned[registerIndex] = immediate;
    this.branch(offset, true);
  }

  branchEqImmediate(registerIndex: number, immediate: number, offset: number) {
    this.branch(offset, this.regs.asUnsigned[registerIndex] === immediate);
  }

  branchEq(firstIndex: number, secondIndex: number, offset: number) {
    this.branchEqImmediate(firstIndex, this.regs.asUnsigned[secondIndex], offset);
  }

  branchNeImmediate(registerIndex: number, immediate: number, offset: number) {
    this.branch(offset, this.regs.asUnsigned[registerIndex] !== immediate);
  }

  branchNe(firstIndex: number, secondIndex: number, offset: number) {
    this.branchNeImmediate(firstIndex, this.regs.asUnsigned[secondIndex], offset);
  }

  branchLtUnsignedImmediate(registerIndex: number, immediate: number, offset: number) {
    this.branch(offset, this.regs.asUnsigned[registerIndex] < immediate);
  }

  branchLtUnsigned(firstIndex: number, secondIndex: number, offset: number) {
    this.branchLtUnsignedImmediate(firstIndex, this.regs.asUnsigned[secondIndex], offset);
  }

  branchLeUnsignedImmediate(registerIndex: number, immediate: number, offset: number) {
    this.branch(offset, this.regs.asUnsigned[registerIndex] <= immediate);
  }

  branchGtUnsignedImmediate(registerIndex: number, immediate: number, offset: number) {
    this.branch(offset, this.regs.asUnsigned[registerIndex] > immediate);
  }

  branchGeUnsignedImmediate(registerIndex: number, immediate: number, offset: number) {
    this.branch(offset, this.regs.asUnsigned[registerIndex] >= immediate);
  }

  branchGeUnsigned(firstIndex: number, secondIndex: number, offset: number) {
    this.branchGeUnsignedImmediate(firstIndex, this.regs.asUnsigned[secondIndex], offset);
  }

  branchLtSignedImmediate(registerIndex: number, immediate: number, offset: number) {
    this.branch(offset, this.regs.asSigned[registerIndex] < immediate);
  }

  branchLtSigned(firstIndex: number, secondIndex: number, offset: number) {
    this.branchLtSignedImmediate(firstIndex, this.regs.asSigned[secondIndex], offset);
  }

  branchLeSignedImmediate(registerIndex: number, immediate: number, offset: number) {
    this.branch(offset, this.regs.asSigned[registerIndex] <= immediate);
  }

  branchGtSignedImmediate(registerIndex: number, immediate: number, offset: number) {
    this.branch(offset, this.regs.asSigned[registerIndex] > immediate);
  }

  branchGeSignedImmediate(registerIndex: number, immediate: number, offset: number) {
    this.branch(offset, this.regs.asSigned[registerIndex] >= immediate);
  }

  branchGeSigned(firstIndex: number, secondIndex: number, offset: number) {
    this.branchGeSignedImmediate(firstIndex, this.regs.asSigned[secondIndex], offset);
  }
}
