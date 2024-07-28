import type { TwoRegistersOneImmediateResult } from "../args-decoder/args-decoder";
import { Instruction } from "../instruction";
import type { BitOps, BooleanOps, MathOps, MoveOps, ShiftOps } from "../ops";

export class TwoRegsOneImmDispatcher {
  constructor(
    private mathOps: MathOps,
    private shiftOps: ShiftOps,
    private bitOps: BitOps,
    private booleanOps: BooleanOps,
    private moveOps: MoveOps,
  ) {}

  dispatch(instruction: Instruction, args: TwoRegistersOneImmediateResult) {
    switch (instruction) {
      case Instruction.ADD_IMM:
        this.mathOps.addImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.MUL_IMM:
        this.mathOps.mulImmediate(args.firstRegisterIndex, args.immediateDecoder.getSigned(), args.secondRegisterIndex);
        break;

      case Instruction.MUL_UPPER_U_U_IMM:
        this.mathOps.mulImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.MUL_UPPER_S_S_IMM:
        this.mathOps.mulImmediate(args.firstRegisterIndex, args.immediateDecoder.getSigned(), args.secondRegisterIndex);
        break;

      case Instruction.NEG_ADD_IMM:
        this.mathOps.negAddImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.SHLO_L_IMM:
        this.shiftOps.shiftLogicalLeftImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.SHLO_L_IMM_ALT:
        this.shiftOps.shiftLogicalLeftImmediateAlternative(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.SHLO_R_IMM:
        this.shiftOps.shiftLogicalRightImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.SHLO_R_IMM_ALT:
        this.shiftOps.shiftLogicalRightImmediateAlternative(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.SHAR_R_IMM:
        this.shiftOps.shiftArithmeticRightImmediate(args.firstRegisterIndex, args.immediateDecoder.getSigned(), args.secondRegisterIndex);
        break;

      case Instruction.SHAR_R_IMM_ALT:
        this.shiftOps.shiftArithmeticRightImmediateAlternative(args.firstRegisterIndex, args.immediateDecoder.getSigned(), args.secondRegisterIndex);
        break;

      case Instruction.OR_IMM:
        this.bitOps.orImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.AND_IMM:
        this.bitOps.andImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.XOR_IMM:
        this.bitOps.xorImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.SET_LT_S_IMM:
        this.booleanOps.setLessThanSignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getSigned(), args.secondRegisterIndex);
        break;

      case Instruction.SET_LT_U_IMM:
        this.booleanOps.setLessThanUnsignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.SET_GT_S_IMM:
        this.booleanOps.setGreaterThanSignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getSigned(), args.secondRegisterIndex);
        break;

      case Instruction.SET_GT_U_IMM:
        this.booleanOps.setGreaterThanUnsignedImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.CMOV_IZ_IMM:
        this.moveOps.cmovIfZeroImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;

      case Instruction.CMOV_NZ_IMM:
        this.moveOps.cmovIfNotZeroImmediate(args.firstRegisterIndex, args.immediateDecoder.getUnsigned(), args.secondRegisterIndex);
        break;
    }
  }
}
