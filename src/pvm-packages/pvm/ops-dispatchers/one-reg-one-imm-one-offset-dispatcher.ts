import type { OneRegisterOneImmediateOneOffsetResult } from "../args-decoder/args-decoder";
import { Instruction } from "../instruction";
import type { BranchOps } from "../ops";

export class OneRegisterOneImmediateOneOffsetDispatcher {
  constructor(private branchOps: BranchOps) {}

  dispatch(instruction: Instruction, args: OneRegisterOneImmediateOneOffsetResult) {
    switch (instruction) {
      case Instruction.LOAD_IMM_JUMP:
        this.branchOps.loadImmediateJump(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.offset);
        break;
      case Instruction.BRANCH_EQ_IMM:
        this.branchOps.branchEqImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.offset);
        break;
      case Instruction.BRANCH_NE_IMM:
        this.branchOps.branchNeImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.offset);
        break;
      case Instruction.BRANCH_LT_U_IMM:
        this.branchOps.branchLtUnsignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.offset);
        break;
      case Instruction.BRANCH_LE_U_IMM:
        this.branchOps.branchLeUnsignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.offset);
        break;
      case Instruction.BRANCH_GE_U_IMM:
        this.branchOps.branchGeUnsignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.offset);
        break;
      case Instruction.BRANCH_GT_U_IMM:
        this.branchOps.branchGtUnsignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.offset);
        break;
      case Instruction.BRANCH_LT_S_IMM:
        this.branchOps.branchLtSignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getSigned(), args.offset);
        break;
      case Instruction.BRANCH_LE_S_IMM:
        this.branchOps.branchLeSignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getSigned(), args.offset);
        break;
      case Instruction.BRANCH_GE_S_IMM:
        this.branchOps.branchGeSignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getSigned(), args.offset);
        break;
      case Instruction.BRANCH_GT_S_IMM:
        this.branchOps.branchGtSignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getSigned(), args.offset);
        break;
    }
  }
}
