import type { TwoRegistersOneOffsetResult } from "../args-decoder/args-decoder";
import { Instruction } from "../instruction";
import type { BranchOps } from "../ops";

export class TwoRegsOneOffsetDispatcher {
  constructor(private branchOps: BranchOps) {}

  dispatch(instruction: Instruction, args: TwoRegistersOneOffsetResult) {
    switch (instruction) {
      case Instruction.BRANCH_EQ:
        this.branchOps.branchEq(args.firstRegisterIndex, args.secondRegisterIndex, args.offset);
        break;
      case Instruction.BRANCH_NE:
        this.branchOps.branchNe(args.firstRegisterIndex, args.secondRegisterIndex, args.offset);
        break;
      case Instruction.BRANCH_LT_U:
        this.branchOps.branchLtUnsigned(args.firstRegisterIndex, args.secondRegisterIndex, args.offset);
        break;
      case Instruction.BRANCH_LT_S:
        this.branchOps.branchLtSigned(args.firstRegisterIndex, args.secondRegisterIndex, args.offset);
        break;
      case Instruction.BRANCH_GE_U:
        this.branchOps.branchGeUnsigned(args.firstRegisterIndex, args.secondRegisterIndex, args.offset);
        break;
      case Instruction.BRANCH_GE_S:
        this.branchOps.branchGeSigned(args.firstRegisterIndex, args.secondRegisterIndex, args.offset);
        break;
    }
  }
}
